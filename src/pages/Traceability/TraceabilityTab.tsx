import React, { useState, useRef, useEffect } from "react";
import {
  IonPage, IonContent, IonHeader, IonToolbar, IonTitle,
  IonButton, IonIcon, IonModal, IonDatetime, IonToast,
  IonSpinner
} from "@ionic/react";
import {
  qrCodeOutline, scanOutline, closeOutline, checkmarkCircleOutline,
  warningOutline, timeOutline, cubeOutline, leafOutline,
  addCircleOutline, removeCircleOutline, constructOutline,
  arrowBackOutline, calendarOutline, checkmarkDoneOutline,
  informationCircleOutline
} from "ionicons/icons";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import jsQR from "jsqr";
import { API_URL } from "../../services/api";
import "./TraceabilityTab.css";

// ─────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────
type FlowState =
  | "idle"
  | "scanning"
  | "camara_menu"
  | "camara_esperando_pallet"
  | "camara_confirmacion_entrada"
  | "camara_esperando_retiro"
  | "camara_confirmacion_salida"
  | "pallet_info"
  | "pallet_montando"
  | "pallet_desmontando"
  | "lote_activado";

interface ScanResult {
  tipo: "camara" | "pallet" | "lote_alimento" | "lote_huevo";
  datos: any;
}

// ─────────────────────────────────────────────
// HELPERS API
// ─────────────────────────────────────────────
const apiFetch = async (path: string, options: RequestInit = {}) => {
  const token = localStorage.getItem("token");

  console.log("➡️ Request:", path);

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  const text = await res.text();

  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    console.error("❌ Respuesta no JSON:", text);
    throw new Error("El servidor devolvió algo inválido (HTML o error)");
  }

  if (res.status === 401) {
    localStorage.removeItem("token");
    window.location.href = "/login";
  }

  if (!res.ok) {
    throw new Error(data.detail || "Error en la petición");
  }

  return data;
};

// ─────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────
const TraceabilityTab: React.FC = () => {
  const [flow, setFlow] = useState<FlowState>("idle");
  const [loading, setLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastColor, setToastColor] = useState<"success" | "danger" | "warning">("success");

  // Datos del flujo actual
  const [camaraData, setCamaraData] = useState<any>(null);
  const [palletData, setPalletData] = useState<any>(null);
  const [entradaResult, setEntradaResult] = useState<any>(null);
  const [salidaResult, setSalidaResult] = useState<any>(null);
  const [loteActivado, setLoteActivado] = useState<any>(null);

  // Fecha de salida modificable
  const [showCalModal, setShowCalModal] = useState(false);
  const [fechaSalidaEdit, setFechaSalidaEdit] = useState<string>("");
  const [fechaSalidaTemporal, setFechaSalidaTemporal] = useState<string>("");

  const showToast = (msg: string, color: "success" | "danger" | "warning" = "success") => {
    setToastMsg(msg);
    setToastColor(color);
  };

  // ─────────────────────────────────────────────
  // ESCÁNER QR via Capacitor Camera + jsQR
  // ─────────────────────────────────────────────
  
  const scanQR = async (): Promise<string | null> => {
    try {
      const { camera } = await BarcodeScanner.requestPermissions();
      if (camera !== "granted" && camera !== "limited") {
        showToast("Permiso de cámara denegado", "danger");
        return null;
      }

      const { barcodes } = await BarcodeScanner.scan();

      if (barcodes && barcodes.length > 0) {
        return barcodes[0].rawValue ?? null;
      }

      showToast("No se detectó ningún QR", "warning");
      return null;
    } catch (err) {
      console.error("Error QR:", err);
      showToast("Error escaneando QR", "danger");
      return null;
    }
  };



  // ─────────────────────────────────────────────
  // ESCÁNER QR via Capacitor Camera + jsQR
  // ─────────────────────────────────────────────
  /*
  const scanQR = async (): Promise<string | null> => {
    try {
      // 🔥 pedir permisos primero
      const permission = await BarcodeScanner.requestPermissions();

      if (permission.camera !== 'granted') {
        alert("Permiso de cámara denegado");
        return null;
      }

      // 🔥 iniciar escaneo
      const result = await BarcodeScanner.scan();

      if (result.barcodes.length > 0) {
        return result.barcodes[0].rawValue;
      }

      return null;

    } catch (err) {
      console.error("ERROR SCAN:", err);
      alert("Error escaneando");
      return null;
    }
  };
  */

  // ─────────────────────────────────────────────
  // ESCANEO INICIAL — identifica el QR
  // ─────────────────────────────────────────────
  const ensureMLKitInstalled = async () => {
    try {
      const { supported } = await BarcodeScanner.isSupported();
      if (!supported) {
        showToast("Escáner no soportado en este dispositivo", "danger");
        return false;
      }

      // Intentar instalar solo si es necesario
      try {
        await BarcodeScanner.installGoogleBarcodeScannerModule();
        console.log("Módulo MLKit instalado ✅");
      } catch (err: any) {
        // Ignorar si ya estaba instalado
        if (err.message.includes("already installed")) {
          console.log("Módulo MLKit ya estaba instalado ✔");
        } else {
          throw err;
        }
      }

      return true;
    } catch (err: any) {
      console.error("Error instalando MLKit:", err);
      showToast("Error inicializando escáner", "danger");
      return false;
    }
  };


  const handleScanInicial = async () => {
    try {
      // Asegurarse que MLKit está listo
      const ready = await ensureMLKitInstalled();
      if (!ready) return;

      // Verificar si está soportado
      const { supported } = await BarcodeScanner.isSupported();
      if (!supported) {
        showToast("Escáner no soportado en este dispositivo", "danger");
        return;
      }

      // Pedir permisos
      const { camera } = await BarcodeScanner.requestPermissions();
      if (camera !== "granted" && camera !== "limited") {
        showToast("Permiso de cámara denegado", "danger");
        return;
      }

      // Escanear
      const { barcodes } = await BarcodeScanner.scan();

      if (!barcodes || barcodes.length === 0) {
        showToast("No se detectó ningún QR", "warning");
        return;
      }

      const codigo = barcodes[0].rawValue?.trim();
      if (!codigo) {
        showToast("QR vacío", "warning");
        return;
      }

      console.log("QR LEÍDO:", codigo);

      const resultApi: ScanResult = await apiFetch(
        `/trazabilidad/scan/${encodeURIComponent(codigo)}`
      );

      if (resultApi.tipo === "camara") {
        setCamaraData(resultApi.datos);
        setFlow("camara_menu");
      } else if (resultApi.tipo === "pallet") {
        setPalletData({ ...resultApi.datos, codigo_qr: codigo });
        setFlow("pallet_info");
      } else if (resultApi.tipo === "lote_alimento") {
        await apiFetch(
          `/trazabilidad/lote_alimento/activar?codigo_qr=${encodeURIComponent(codigo)}`,
          { method: "POST" }
        );
        setLoteActivado({ tipo: "Lote de Alimento", ...resultApi.datos });
        setFlow("lote_activado");
      } else if (resultApi.tipo === "lote_huevo") {
        await apiFetch(`/trazabilidad/lote_huevo/activar`, {
          method: "POST",
          body: JSON.stringify({ codigo_qr: codigo }),
        });
        setLoteActivado({ tipo: "Lote de Huevo", ...resultApi.datos });
        setFlow("lote_activado");
      }

    } catch (err: any) {
      console.error("Error escáner:", err);
      showToast(err.message || "Error al escanear", "danger");
    }
  };

  // ─────────────────────────────────────────────
  // FLUJO CÁMARA — AÑADIR PALLET
  // ─────────────────────────────────────────────
  const handleEsperarPallet = () => {
    setFlow("camara_esperando_pallet");
  };

  const handleScanPalletEntrada = async () => {
    if (loading) return;
    setLoading(true);
    const codigo = await scanQR();
    setLoading(false);

    if (!codigo) {
      showToast("No se pudo leer el QR. Inténtalo de nuevo.", "warning");
      return;
    }

    try {
      setLoading(true);
      const result = await apiFetch("/trazabilidad/camara/entrada", {
        method: "POST",
        body: JSON.stringify({
          codigo_qr_camara: camaraData.codigo_qr,
          codigo_qr_pallet: codigo,
        }),
      });
      setLoading(false);
      setEntradaResult({ ...result, codigo_qr_pallet: codigo });
      setFechaSalidaEdit(result.fecha_salida_prevista || "");
      setFlow("camara_confirmacion_entrada");
    } catch (err: any) {
      setLoading(false);
      showToast(err.message, "danger");
    }
  };

  // ─────────────────────────────────────────────
  // FLUJO CÁMARA — RETIRAR PALLET
  // ─────────────────────────────────────────────
  const handleEsperarRetiro = () => {
    setFlow("camara_esperando_retiro");
  };

  const handleScanPalletSalida = async () => {
    if (loading) return;
    setLoading(true);
    const codigo = await scanQR();
    setLoading(false);

    if (!codigo) {
      showToast("No se pudo leer el QR. Inténtalo de nuevo.", "warning");
      return;
    }

    try {
      setLoading(true);
      const result = await apiFetch("/trazabilidad/camara/salida", {
        method: "POST",
        body: JSON.stringify({ codigo_qr_pallet: codigo, confirmar: false }),
      });
      setLoading(false);
      setSalidaResult({ ...result, codigo_qr_pallet: codigo });
      setFlow("camara_confirmacion_salida");
    } catch (err: any) {
      setLoading(false);
      showToast(err.message, "danger");
    }
  };

  const handleConfirmarSalida = async () => {
    try {
      setLoading(true);
      await apiFetch("/trazabilidad/camara/salida", {
        method: "POST",
        body: JSON.stringify({ codigo_qr_pallet: salidaResult.codigo_qr_pallet, confirmar: true }),
      });
      setLoading(false);
      showToast("Pallet retirado correctamente", "success");
      resetFlow();
    } catch (err: any) {
      setLoading(false);
      showToast(err.message, "danger");
    }
  };

  // ─────────────────────────────────────────────
  // MODIFICAR FECHA DE SALIDA
  // ─────────────────────────────────────────────
  const handleGuardarFecha = async () => {
    if (!fechaSalidaTemporal) return;
    try {
      setLoading(true);
      await apiFetch(
        `/trazabilidad/pallet/${encodeURIComponent(entradaResult.codigo_qr_pallet)}/fecha_salida`,
        {
          method: "PUT",
          body: JSON.stringify({ fecha_salida_prevista: fechaSalidaTemporal.split("T")[0] }),
        }
      );
      setFechaSalidaEdit(fechaSalidaTemporal.split("T")[0]);
      setLoading(false);
      setShowCalModal(false);
      showToast("Fecha de salida actualizada", "success");
    } catch (err: any) {
      setLoading(false);
      showToast(err.message, "danger");
    }
  };

  // ─────────────────────────────────────────────
  // FLUJO PALLET — MONTAR
  // ─────────────────────────────────────────────
  const handleMontarPallet = async () => {
    if (!palletData) return;
    try {
      setLoading(true);
      const result = await apiFetch("/trazabilidad/pallet/montar", {
        method: "POST",
        body: JSON.stringify({ codigo_qr_pallet: palletData.codigo_qr }),
      });
      setLoading(false);
      setPalletData({ ...palletData, estado: "preparado" });
      showToast("Pallet montado correctamente", "success");
      setFlow("pallet_montando");
    } catch (err: any) {
      setLoading(false);
      showToast(err.message, "danger");
    }
  };

  // ─────────────────────────────────────────────
  // FLUJO PALLET — DESMONTAR
  // ─────────────────────────────────────────────
  const handleDesmontarPallet = async () => {
    if (!palletData) return;
    try {
      setLoading(true);
      await apiFetch("/trazabilidad/pallet/desmontar", {
        method: "POST",
        body: JSON.stringify({ codigo_qr_pallet: palletData.codigo_qr }),
      });
      setLoading(false);
      showToast("Pallet desmontado y listo para nuevo ciclo", "success");
      setFlow("pallet_desmontando");
    } catch (err: any) {
      setLoading(false);
      showToast(err.message, "danger");
    }
  };

  // ─────────────────────────────────────────────
  // RESET
  // ─────────────────────────────────────────────
  const resetFlow = () => {
    setFlow("idle");
    setCamaraData(null);
    setPalletData(null);
    setEntradaResult(null);
    setSalidaResult(null);
    setLoteActivado(null);
    setFechaSalidaEdit("");
  };

  // ─────────────────────────────────────────────
  // ESTADO BADGE
  // ─────────────────────────────────────────────
  const estadoBadge = (estado: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      vacio: { label: "Vacío", cls: "badge-vacio" },
      preparado: { label: "Preparado", cls: "badge-preparado" },
      en_camara: { label: "En Cámara", cls: "badge-en-camara" },
      desmontar: { label: "Desmontar", cls: "badge-desmontar" },
    };
    const info = map[estado] || { label: estado, cls: "" };
    return <span className={`estado-badge ${info.cls}`}>{info.label}</span>;
  };

  // ─────────────────────────────────────────────
  // RENDER POR ESTADO
  // ─────────────────────────────────────────────

  const renderIdle = () => (
    <div className="traz-idle">
      <div className="traz-idle-icon-wrap">
        <div className="traz-idle-ring ring1" />
        <div className="traz-idle-ring ring2" />
        <IonIcon icon={qrCodeOutline} className="traz-idle-icon" />
      </div>
      <h2 className="traz-idle-title">Trazabilidad</h2>
      <p className="traz-idle-sub">Escanea un QR de cámara, pallet o lote para comenzar</p>
      <IonButton
        expand="block"
        className="traz-scan-btn"
        onClick={handleScanInicial}
        disabled={loading}
      >
        {loading ? <IonSpinner name="crescent" /> : (
          <>
            <IonIcon icon={scanOutline} slot="start" />
            Escanear QR
          </>
        )}
      </IonButton>
    </div>
  );

  const renderCamaraMenu = () => (
    <div className="traz-card">
      <div className="traz-card-header">
        <IonIcon icon={cubeOutline} className="traz-card-icon" />
        <div>
          <h3 className="traz-card-title">{camaraData?.nombre || `Cámara #${camaraData?.id_camara}`}</h3>
          <p className="traz-card-sub">
            {camaraData?.pallets_dentro} / {camaraData?.capacidad_max} pallets
            &nbsp;·&nbsp;{camaraData?.huecos_libres} huecos libres
          </p>
        </div>
      </div>

      <div className="traz-camara-actions">
        <button className="traz-action-btn traz-action-add" onClick={handleEsperarPallet}>
          <IonIcon icon={addCircleOutline} />
          <span>Añadir pallet</span>
        </button>
        <button className="traz-action-btn traz-action-remove" onClick={handleEsperarRetiro}>
          <IonIcon icon={removeCircleOutline} />
          <span>Retirar pallet</span>
        </button>
      </div>

      <button className="traz-cancel-btn" onClick={resetFlow}>
        <IonIcon icon={closeOutline} />
        Cancelar escaneo
      </button>
    </div>
  );

  const renderEsperandoPallet = (modo: "entrada" | "salida") => (
    <div className="traz-waiting">
      <div className="traz-waiting-anim">
        <div className="traz-waiting-pulse" />
        <IonIcon icon={scanOutline} className="traz-waiting-icon" />
      </div>
      <h3 className="traz-waiting-title">
        {modo === "entrada" ? "Esperando escaneo de pallet" : "Escanea el pallet a retirar"}
      </h3>
      <p className="traz-waiting-sub">
        Apunta la cámara al QR del pallet
      </p>
      <IonButton
        expand="block"
        className="traz-scan-btn"
        onClick={modo === "entrada" ? handleScanPalletEntrada : handleScanPalletSalida}
        disabled={loading}
      >
        {loading ? <IonSpinner name="crescent" /> : (
          <>
            <IonIcon icon={scanOutline} slot="start" />
            Escanear pallet
          </>
        )}
      </IonButton>
      <button className="traz-cancel-btn" onClick={() => setFlow("camara_menu")}>
        <IonIcon icon={arrowBackOutline} />
        Volver al menú
      </button>
    </div>
  );

  const renderConfirmacionEntrada = () => (
    <div className="traz-result traz-result--success">
      <div className="traz-result-icon-wrap">
        <IonIcon icon={checkmarkCircleOutline} className="traz-result-icon success" />
      </div>
      <h3 className="traz-result-title">Pallet insertado en cámara</h3>

      <div className="traz-info-grid">
        <div className="traz-info-row">
          <IonIcon icon={timeOutline} />
          <span className="traz-info-label">Entrada</span>
          <span className="traz-info-value">{entradaResult?.fecha_entrada_camara}</span>
        </div>
        <div className="traz-info-row">
          <IonIcon icon={calendarOutline} />
          <span className="traz-info-label">Salida prevista</span>
          <span className="traz-info-value">{fechaSalidaEdit || entradaResult?.fecha_salida_prevista}</span>
        </div>
        {entradaResult?.lote_alimento && (
          <div className="traz-info-row">
            <IonIcon icon={leafOutline} />
            <span className="traz-info-label">Lote alimento</span>
            <span className="traz-info-value traz-lote-tag">
              #{entradaResult.lote_alimento.id_lote_alimento} — {entradaResult.lote_alimento.descripcion}
            </span>
          </div>
        )}
        {entradaResult?.lote_huevo && (
          <div className="traz-info-row">
            <IonIcon icon={cubeOutline} />
            <span className="traz-info-label">Lote huevo</span>
            <span className="traz-info-value traz-lote-tag">
              #{entradaResult.lote_huevo.id_lote_huevo} — {entradaResult.lote_huevo.origen}
            </span>
          </div>
        )}
      </div>

      <button className="traz-modify-date-btn" onClick={() => setShowCalModal(true)}>
        <IonIcon icon={calendarOutline} />
        Modificar fecha de salida
      </button>

      <IonButton expand="block" className="traz-done-btn" onClick={resetFlow}>
        <IonIcon icon={checkmarkDoneOutline} slot="start" />
        Listo
      </IonButton>
    </div>
  );

  const renderConfirmacionSalida = () => {
    const cumplido = salidaResult?.cumplido_plazo;
    return (
      <div className={`traz-result ${cumplido ? "traz-result--success" : "traz-result--warning"}`}>
        <div className="traz-result-icon-wrap">
          <IonIcon
            icon={cumplido ? checkmarkCircleOutline : warningOutline}
            className={`traz-result-icon ${cumplido ? "success" : "warning"}`}
          />
        </div>
        <h3 className="traz-result-title">Información de retirada</h3>

        <div className="traz-info-grid">
          <div className="traz-info-row">
            <IonIcon icon={timeOutline} />
            <span className="traz-info-label">Entrada</span>
            <span className="traz-info-value">{salidaResult?.fecha_entrada_camara}</span>
          </div>
          <div className="traz-info-row">
            <IonIcon icon={calendarOutline} />
            <span className="traz-info-label">Salida prevista</span>
            <span className="traz-info-value">{salidaResult?.fecha_salida_prevista}</span>
          </div>
          <div className="traz-info-row">
            <IonIcon icon={timeOutline} />
            <span className="traz-info-label">Días en cámara</span>
            <span className="traz-info-value">{salidaResult?.dias_en_camara} días</span>
          </div>
          <div className="traz-info-row">
            <span className="traz-info-label">Estado</span>
            <span className={`traz-plazo-badge ${cumplido ? "traz-plazo-ok" : "traz-plazo-nok"}`}>
              {cumplido ? "✓ Plazo cumplido" : "⚠ Retirada anticipada"}
            </span>
          </div>
        </div>

        <IonButton expand="block" className="traz-confirm-btn" onClick={handleConfirmarSalida} disabled={loading}>
          {loading ? <IonSpinner name="crescent" /> : (
            <>
              <IonIcon icon={checkmarkCircleOutline} slot="start" />
              Confirmar retirada
            </>
          )}
        </IonButton>
        <button className="traz-cancel-btn" onClick={resetFlow}>
          <IonIcon icon={closeOutline} />
          Cancelar
        </button>
      </div>
    );
  };

  const renderPalletInfo = () => {
    const estado = palletData?.estado;
    return (
      <div className="traz-card">
        <div className="traz-card-header">
          <IonIcon icon={cubeOutline} className="traz-card-icon" />
          <div>
            <h3 className="traz-card-title">Pallet #{palletData?.id_pallet}</h3>
            {estadoBadge(estado)}
          </div>
        </div>

        <div className="traz-info-grid">
          {palletData?.lote_alimento_desc && (
            <div className="traz-info-row">
              <IonIcon icon={leafOutline} />
              <span className="traz-info-label">Alimento</span>
              <span className="traz-info-value">{palletData.lote_alimento_desc}</span>
            </div>
          )}
          {palletData?.lote_huevo_origen && (
            <div className="traz-info-row">
              <IonIcon icon={cubeOutline} />
              <span className="traz-info-label">Huevo</span>
              <span className="traz-info-value">{palletData.lote_huevo_origen}</span>
            </div>
          )}
          {palletData?.fecha_entrada_camara && (
            <div className="traz-info-row">
              <IonIcon icon={timeOutline} />
              <span className="traz-info-label">En cámara desde</span>
              <span className="traz-info-value">{palletData.fecha_entrada_camara}</span>
            </div>
          )}
          {palletData?.fecha_salida_prevista && (
            <div className="traz-info-row">
              <IonIcon icon={calendarOutline} />
              <span className="traz-info-label">Salida prevista</span>
              <span className="traz-info-value">{palletData.fecha_salida_prevista}</span>
            </div>
          )}
        </div>

        <div className="traz-pallet-actions">
          {estado === "vacio" && (
            <IonButton expand="block" className="traz-action-primary" onClick={handleMontarPallet} disabled={loading}>
              <IonIcon icon={constructOutline} slot="start" />
              Montar pallet
            </IonButton>
          )}
          {estado === "desmontar" && (
            <IonButton expand="block" className="traz-action-danger" onClick={handleDesmontarPallet} disabled={loading}>
              <IonIcon icon={removeCircleOutline} slot="start" />
              Desmontar pallet
            </IonButton>
          )}
          {(estado === "preparado" || estado === "en_camara") && (
            <div className="traz-info-only">
              <IonIcon icon={informationCircleOutline} />
              <span>Este pallet está {estado === "preparado" ? "listo para cámara" : "dentro de una cámara"}</span>
            </div>
          )}
        </div>

        <button className="traz-cancel-btn" onClick={resetFlow}>
          <IonIcon icon={arrowBackOutline} />
          Volver
        </button>
      </div>
    );
  };

  const renderPalletMontando = () => (
    <div className="traz-result traz-result--success">
      <IonIcon icon={checkmarkCircleOutline} className="traz-result-icon success" />
      <h3 className="traz-result-title">Pallet montado</h3>
      <p className="traz-result-sub">El pallet está listo para entrar a cámara. Ya tiene asignado el lote de alimento y de huevo activos.</p>
      <IonButton expand="block" className="traz-done-btn" onClick={resetFlow}>
        <IonIcon icon={checkmarkDoneOutline} slot="start" />
        Listo
      </IonButton>
    </div>
  );

  const renderPalletDesmontando = () => (
    <div className="traz-result traz-result--neutral">
      <IonIcon icon={checkmarkCircleOutline} className="traz-result-icon success" />
      <h3 className="traz-result-title">Pallet desmontado</h3>
      <p className="traz-result-sub">Los lotes se han desasignado. El pallet está vacío y listo para un nuevo ciclo.</p>
      <IonButton expand="block" className="traz-done-btn" onClick={resetFlow}>
        <IonIcon icon={checkmarkDoneOutline} slot="start" />
        Listo
      </IonButton>
    </div>
  );

  const renderLoteActivado = () => (
    <div className="traz-result traz-result--success">
      <IonIcon icon={leafOutline} className="traz-result-icon success" />
      <h3 className="traz-result-title">{loteActivado?.tipo} activado</h3>
      <p className="traz-result-sub">
        El lote anterior ha sido finalizado. El nuevo lote queda como activo y será asignado a los próximos pallets.
      </p>
      <div className="traz-info-grid">
        {loteActivado?.descripcion && (
          <div className="traz-info-row">
            <span className="traz-info-label">Descripción</span>
            <span className="traz-info-value">{loteActivado.descripcion}</span>
          </div>
        )}
        {loteActivado?.origen && (
          <div className="traz-info-row">
            <span className="traz-info-label">Origen</span>
            <span className="traz-info-value">{loteActivado.origen}</span>
          </div>
        )}
      </div>
      <IonButton expand="block" className="traz-done-btn" onClick={resetFlow}>
        <IonIcon icon={checkmarkDoneOutline} slot="start" />
        Listo
      </IonButton>
    </div>
  );

  // ─────────────────────────────────────────────
  // RENDER FINAL
  // ─────────────────────────────────────────────
  return (
    <IonPage className="traz-page">
      <IonHeader>
        <IonToolbar className="traz-toolbar">
          <IonTitle className="traz-toolbar-title">
            <IonIcon icon={qrCodeOutline} style={{ marginRight: 8, verticalAlign: "middle" }} />
            Trazabilidad
          </IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="traz-content">
        <div className="traz-container">
          {flow === "idle" && renderIdle()}
          {flow === "camara_menu" && renderCamaraMenu()}
          {flow === "camara_esperando_pallet" && renderEsperandoPallet("entrada")}
          {flow === "camara_esperando_retiro" && renderEsperandoPallet("salida")}
          {flow === "camara_confirmacion_entrada" && renderConfirmacionEntrada()}
          {flow === "camara_confirmacion_salida" && renderConfirmacionSalida()}
          {flow === "pallet_info" && renderPalletInfo()}
          {flow === "pallet_montando" && renderPalletMontando()}
          {flow === "pallet_desmontando" && renderPalletDesmontando()}
          {flow === "lote_activado" && renderLoteActivado()}
        </div>

        {/* Modal calendario fecha salida */}
        <IonModal isOpen={showCalModal} onDidDismiss={() => setShowCalModal(false)} className="traz-modal-cal">
          <div className="traz-modal-inner">
            <h3 className="traz-modal-title">Modificar fecha de salida</h3>
            <IonDatetime
              presentation="date"
              value={fechaSalidaTemporal || fechaSalidaEdit}
              min={new Date().toISOString().split("T")[0]}
              onIonChange={e => setFechaSalidaTemporal(e.detail.value as string)}
              style={{ "--background": "var(--color-accent)", color: "var(--text-primary)" } as any}
            />
            <IonButton expand="block" className="traz-modal-confirm" onClick={handleGuardarFecha} disabled={loading}>
              {loading ? <IonSpinner name="crescent" /> : "Confirmar fecha"}
            </IonButton>
            <IonButton expand="block" fill="clear" onClick={() => setShowCalModal(false)}>
              Cancelar
            </IonButton>
          </div>
        </IonModal>

        <IonToast
          isOpen={!!toastMsg}
          message={toastMsg}
          duration={3000}
          color={toastColor}
          onDidDismiss={() => setToastMsg("")}
        />
      </IonContent>
    </IonPage>
  );
};

export default TraceabilityTab;
