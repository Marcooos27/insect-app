import React, { useState, useEffect } from "react";
import {
  IonPage, IonContent, IonHeader, IonToolbar, IonTitle,
  IonButton, IonIcon, IonModal, IonDatetime, IonToast,
  IonSpinner, IonAlert
} from "@ionic/react";
import {
  qrCodeOutline, scanOutline, closeOutline, checkmarkCircleOutline,
  warningOutline, timeOutline, cubeOutline, leafOutline,
  addCircleOutline, removeCircleOutline, constructOutline,
  arrowBackOutline, calendarOutline, checkmarkDoneOutline,
  informationCircleOutline, cutOutline, bagHandleOutline,
  stopCircleOutline, playOutline
} from "ionicons/icons";
import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import { API_URL } from "../../services/api";
import "./TraceabilityTab.css";

// ─────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────
type FlowState =
  | "idle"
  | "camara_menu"
  | "camara_esperando_pallet"
  | "camara_confirmacion_entrada"
  | "camara_esperando_retiro"
  | "camara_confirmacion_salida"
  | "pallet_info"
  | "pallet_montando"
  | "lote_activado"
  | "cribado_escaneando"
  | "cribado_en_proceso"
  | "cribado_big_bag_creado";

interface ScanResult {
  tipo: "camara" | "pallet" | "lote_alimento" | "lote_huevo";
  datos: any;
}

interface SesionActiva {
  id_sesion: number;
  fecha_inicio: string;
  pallets_cribados: { codigo_qr: string }[];
  total_cribados: number;
}

// ─────────────────────────────────────────────
// API HELPER
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
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    console.error("❌ Respuesta no JSON:", text);
    throw new Error("El servidor devolvió algo inválido");
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

  // Datos flujo cámara
  const [camaraData, setCamaraData] = useState<any>(null);
  const [palletData, setPalletData] = useState<any>(null);
  const [entradaResult, setEntradaResult] = useState<any>(null);
  const [salidaResult, setSalidaResult] = useState<any>(null);
  const [loteActivado, setLoteActivado] = useState<any>(null);

  // Fecha salida
  const [showCalModal, setShowCalModal] = useState(false);
  const [fechaSalidaEdit, setFechaSalidaEdit] = useState<string>("");
  const [fechaSalidaTemporal, setFechaSalidaTemporal] = useState<string>("");

  // Cribado
  const [sesionActiva, setSesionActiva] = useState<SesionActiva | null>(null);
  const [palletCribandoActual, setPalletCribandoActual] = useState<any>(null);
  const [bigBagResult, setBigBagResult] = useState<any>(null);
  const [cancelAlertOpen, setCancelAlertOpen] = useState(false);

  // Alertas de confirmación
  const [alertConfig, setAlertConfig] = useState<{
    isOpen: boolean;
    header: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, header: "", message: "", onConfirm: () => {} });

  const showToast = (msg: string, color: "success" | "danger" | "warning" = "success") => {
    setToastMsg(msg);
    setToastColor(color);
  };

  const showAlert = (header: string, message: string, onConfirm: () => void) => {
    setAlertConfig({ isOpen: true, header, message, onConfirm });
  };

  // Comprobar sesión activa al montar
  useEffect(() => {
    apiFetch("/trazabilidad/procesado/sesion_activa")
      .then(res => {
        if (res.sesion_activa) {
          setSesionActiva(res.sesion_activa);
        }
      })
      .catch(() => {});
  }, []);

  // ─────────────────────────────────────────────
  // ESCÁNER QR
  // ─────────────────────────────────────────────
  const scanQR = async (): Promise<string | null> => {
    try {
      const { supported } = await BarcodeScanner.isSupported();
      if (!supported) {
        showToast("Escáner no soportado", "danger");
        return null;
      }
      try { await BarcodeScanner.installGoogleBarcodeScannerModule(); } catch {}

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
  // ESCANEO INICIAL
  // ─────────────────────────────────────────────
  const handleScanInicial = async () => {
    setLoading(true);
    const codigo = await scanQR();
    setLoading(false);
    if (!codigo) return;

    try {
      setLoading(true);
      const resultApi: ScanResult = await apiFetch(
        `/trazabilidad/scan/${encodeURIComponent(codigo)}`
      );
      setLoading(false);

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
      setLoading(false);
      showToast(err.message || "Error al escanear", "danger");
    }
  };

  // ─────────────────────────────────────────────
  // FLUJO CÁMARA
  // ─────────────────────────────────────────────
  const handleScanPalletEntrada = async () => {
    if (loading) return;
    setLoading(true);
    const codigo = await scanQR();
    setLoading(false);
    if (!codigo) return;

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

  const handleScanPalletSalida = async () => {
    if (loading) return;
    setLoading(true);
    const codigo = await scanQR();
    setLoading(false);
    if (!codigo) return;

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
    showAlert(
      "Confirmar salida de cámara",
      "¿Confirmas que este pallet sale de la cámara?",
      async () => {
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
      }
    );
  };

  const handleGuardarFecha = async () => {
    if (!fechaSalidaTemporal) return;
    try {
      setLoading(true);
      await apiFetch(
        `/trazabilidad/pallet/${encodeURIComponent(entradaResult.codigo_qr_pallet)}/fecha_salida`,
        { method: "PUT", body: JSON.stringify({ fecha_salida_prevista: fechaSalidaTemporal.split("T")[0] }) }
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

  const handleMontarPallet = async () => {
    if (!palletData) return;
    try {
      setLoading(true);
      await apiFetch("/trazabilidad/pallet/montar", {
        method: "POST",
        body: JSON.stringify({ codigo_qr_pallet: palletData.codigo_qr }),
      });
      setLoading(false);
      showToast("Pallet montado correctamente", "success");
      setFlow("pallet_montando");
    } catch (err: any) {
      setLoading(false);
      showToast(err.message, "danger");
    }
  };

  // ─────────────────────────────────────────────
  // FLUJO CRIBADO
  // ─────────────────────────────────────────────
  const handleIniciarCribado = async () => {
    try {
      setLoading(true);
      const res = await apiFetch("/trazabilidad/procesado/iniciar", {
        method: "POST",
        body: JSON.stringify({}),
      });
      setLoading(false);
      setSesionActiva({
        id_sesion: res.id_sesion,
        fecha_inicio: res.fecha_inicio,
        pallets_cribados: [],
        total_cribados: 0,
      });
      setFlow("cribado_escaneando");
      showToast(`Sesión #${res.id_sesion} iniciada`, "success");
    } catch (err: any) {
      setLoading(false);
      showToast(err.message, "danger");
    }
  };



  const cancelarSesion = async (motivo: string) => {
    if (!sesionActiva) return;

    try {
      setLoading(true);

      await apiFetch("/trazabilidad/procesado/cancelar", {
        method: "POST",
        body: JSON.stringify({
          id_sesion: sesionActiva.id_sesion,
          motivo
        }),
      });

      setCancelAlertOpen(false);
      setSesionActiva(null);
      resetFlow();
      showToast("Sesión cancelada", "warning");

    } catch (err: any) {
      showToast(err.message, "danger");
    }
  };




  const handleScanPalletCribado = async () => {
    if (!sesionActiva) return;
    if (loading) return;

    setLoading(true);
    const codigo = await scanQR();
    setLoading(false);
    if (!codigo) return;

    // Verificar que el pallet está en estado fuera_camara
    try {
      setLoading(true);
      const info = await apiFetch(`/trazabilidad/scan/${encodeURIComponent(codigo)}`);
      setLoading(false);

      if (info.tipo !== "pallet") {
        showToast("QR no es un pallet", "warning");
        return;
      }
      if (info.datos.estado !== "fuera_camara") {
        showToast(`Pallet en estado '${info.datos.estado}'. Debe estar 'fuera_camara'.`, "warning");
        return;
      }

      setPalletCribandoActual({ ...info.datos, codigo_qr: codigo });
      setFlow("cribado_en_proceso");
    } catch (err: any) {
      setLoading(false);
      showToast(err.message, "danger");
    }
  };

  const handlePalletCribado = () => {
    showAlert(
      "Confirmar pallet cribado",
      `¿Confirmas que el pallet ${palletCribandoActual?.codigo_qr} ha sido cribado completamente?`,
      async () => {
        if (!sesionActiva || !palletCribandoActual) return;
        try {
          setLoading(true);
          const res = await apiFetch("/trazabilidad/procesado/pallet_cribado", {
            method: "POST",
            body: JSON.stringify({
              id_sesion: sesionActiva.id_sesion,
              codigo_qr_pallet: palletCribandoActual.codigo_qr,
            }),
          });
          setLoading(false);

          const nuevaSesion: SesionActiva = {
            ...sesionActiva,
            pallets_cribados: [
              ...sesionActiva.pallets_cribados,
              { codigo_qr: palletCribandoActual.codigo_qr }
            ],
            total_cribados: res.total_cribados_sesion,
          };
          setSesionActiva(nuevaSesion);
          setPalletCribandoActual(null);
          showToast("Pallet cribado ✓", "success");
          setFlow("cribado_escaneando");
        } catch (err: any) {
          setLoading(false);
          showToast(err.message, "danger");
        }
      }
    );
  };

  const handleCancelarPalletCribado = () => {
    setPalletCribandoActual(null);
    setFlow("cribado_escaneando");
  };

  const handleBigBagLleno = () => {
    showAlert(
      "Big bag lleno",
      "¿Confirmas que el big bag está lleno? Se generará un lote final de Frass.",
      async () => {
        if (!sesionActiva) return;
        try {
          setLoading(true);
          const res = await apiFetch("/trazabilidad/procesado/big_bag_lleno", {
            method: "POST",
            body: JSON.stringify({ id_sesion: sesionActiva.id_sesion }),
          });
          setLoading(false);
          setBigBagResult(res);
          setFlow("cribado_big_bag_creado");
          showToast(`Lote ${res.codigo_lote} creado`, "success");
        } catch (err: any) {
          setLoading(false);
          showToast(err.message, "danger");
        }
      }
    );
  };

  const handleTerminarSesion = () => {
    showAlert(
      "Terminar sesión de cribado",
      `¿Confirmas que quieres terminar la sesión? Se han cribado ${sesionActiva?.total_cribados ?? 0} pallets.`,
      async () => {
        if (!sesionActiva) return;
        try {
          setLoading(true);
          const res = await apiFetch("/trazabilidad/procesado/terminar", {
            method: "POST",
            body: JSON.stringify({ id_sesion: sesionActiva.id_sesion }),
          });
          setLoading(false);

          if (res.lote_final_creado) {
            showToast(`Sesión finalizada. Lote ${res.lote_final_creado.codigo_lote} generado.`, "success");
          } else {
            showToast("Sesión de cribado finalizada", "success");
          }

          setSesionActiva(null);
          resetFlow();
        } catch (err: any) {
          setLoading(false);
          showToast(err.message, "danger");
        }
      }
    );
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
    setPalletCribandoActual(null);
    setBigBagResult(null);
  };

  // ─────────────────────────────────────────────
  // HELPERS UI
  // ─────────────────────────────────────────────
  const estadoBadge = (estado: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      vacio: { label: "Vacío", cls: "badge-vacio" },
      preparado: { label: "Preparado", cls: "badge-preparado" },
      en_camara: { label: "En Cámara", cls: "badge-en-camara" },
      fuera_camara: { label: "Fuera de cámara", cls: "badge-desmontar" },
    };
    const info = map[estado] || { label: estado, cls: "" };
    return <span className={`estado-badge ${info.cls}`}>{info.label}</span>;
  };

  // ─────────────────────────────────────────────
  // RENDERS
  // ─────────────────────────────────────────────

  const renderIdle = () => (
    <div className="traz-idle">
      <div className="traz-idle-icon-wrap">
        <div className="traz-idle-ring ring1" />
        <div className="traz-idle-ring ring2" />
        <IonIcon icon={qrCodeOutline} className="traz-idle-icon" />
      </div>
      <h2 className="traz-idle-title">Trazabilidad</h2>
      <p className="traz-idle-sub">Escanea un QR o inicia una sesión de cribado</p>

      <IonButton expand="block" className="traz-scan-btn" onClick={handleScanInicial} disabled={loading}>
        {loading ? <IonSpinner name="crescent" /> : (
          <><IonIcon icon={scanOutline} slot="start" />Escanear QR</>
        )}
      </IonButton>

      {/* Botón de cribado */}
      {sesionActiva ? (
        <IonButton
          expand="block"
          className="traz-cribado-btn traz-cribado-btn--activo"
          onClick={() => setFlow("cribado_escaneando")}
          style={{ marginTop: 12 }}
        >
          <IonIcon icon={cutOutline} slot="start" />
          Sesión activa #{sesionActiva.id_sesion} — continuar
        </IonButton>
      ) : (
        <IonButton
          expand="block"
          className="traz-cribado-btn"
          onClick={handleIniciarCribado}
          disabled={loading}
          style={{ marginTop: 12 }}
        >
          {loading ? <IonSpinner name="crescent" /> : (
            <><IonIcon icon={cutOutline} slot="start" />Iniciar cribado</>
          )}
        </IonButton>
      )}
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
        <button className="traz-action-btn traz-action-add" onClick={() => setFlow("camara_esperando_pallet")}>
          <IonIcon icon={addCircleOutline} /><span>Añadir pallet</span>
        </button>
        <button className="traz-action-btn traz-action-remove" onClick={() => setFlow("camara_esperando_retiro")}>
          <IonIcon icon={removeCircleOutline} /><span>Retirar pallet</span>
        </button>
      </div>
      <button className="traz-cancel-btn" onClick={resetFlow}>
        <IonIcon icon={closeOutline} />Cancelar escaneo
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
        {modo === "entrada" ? "Escanea el pallet a añadir" : "Escanea el pallet a retirar"}
      </h3>
      <IonButton expand="block" className="traz-scan-btn"
        onClick={modo === "entrada" ? handleScanPalletEntrada : handleScanPalletSalida}
        disabled={loading}>
        {loading ? <IonSpinner name="crescent" /> : (
          <><IonIcon icon={scanOutline} slot="start" />Escanear pallet</>
        )}
      </IonButton>
      <button className="traz-cancel-btn" onClick={() => setFlow("camara_menu")}>
        <IonIcon icon={arrowBackOutline} />Volver al menú
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
      </div>
      <button className="traz-modify-date-btn" onClick={() => setShowCalModal(true)}>
        <IonIcon icon={calendarOutline} />Modificar fecha de salida
      </button>
      <IonButton expand="block" className="traz-done-btn" onClick={resetFlow}>
        <IonIcon icon={checkmarkDoneOutline} slot="start" />Listo
      </IonButton>
    </div>
  );

  const renderConfirmacionSalida = () => {
    const cumplido = salidaResult?.cumplido_plazo;
    return (
      <div className={`traz-result ${cumplido ? "traz-result--success" : "traz-result--warning"}`}>
        <div className="traz-result-icon-wrap">
          <IonIcon icon={cumplido ? checkmarkCircleOutline : warningOutline}
            className={`traz-result-icon ${cumplido ? "success" : "warning"}`} />
        </div>
        <h3 className="traz-result-title">Información de retirada</h3>
        <div className="traz-info-grid">
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
            <><IonIcon icon={checkmarkCircleOutline} slot="start" />Confirmar retirada</>
          )}
        </IonButton>
        <button className="traz-cancel-btn" onClick={resetFlow}>
          <IonIcon icon={closeOutline} />Cancelar
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
              <IonIcon icon={constructOutline} slot="start" />Montar pallet
            </IonButton>
          )}
          {(estado === "preparado" || estado === "en_camara" || estado === "fuera_camara") && (
            <div className="traz-info-only">
              <IonIcon icon={informationCircleOutline} />
              <span>
                {estado === "preparado" && "Listo para entrar a cámara"}
                {estado === "en_camara" && "Dentro de una cámara"}
                {estado === "fuera_camara" && "Fuera de cámara — pendiente de cribar"}
              </span>
            </div>
          )}
        </div>
        <button className="traz-cancel-btn" onClick={resetFlow}>
          <IonIcon icon={arrowBackOutline} />Volver
        </button>
      </div>
    );
  };

  const renderPalletMontando = () => (
    <div className="traz-result traz-result--success">
      <IonIcon icon={checkmarkCircleOutline} className="traz-result-icon success" />
      <h3 className="traz-result-title">Pallet montado</h3>
      <p className="traz-result-sub">El pallet está listo para entrar a cámara.</p>
      <IonButton expand="block" className="traz-done-btn" onClick={resetFlow}>
        <IonIcon icon={checkmarkDoneOutline} slot="start" />Listo
      </IonButton>
    </div>
  );

  const renderLoteActivado = () => (
    <div className="traz-result traz-result--success">
      <IonIcon icon={leafOutline} className="traz-result-icon success" />
      <h3 className="traz-result-title">{loteActivado?.tipo} activado</h3>
      <p className="traz-result-sub">El nuevo lote queda activo y será asignado a los próximos pallets.</p>
      <IonButton expand="block" className="traz-done-btn" onClick={resetFlow}>
        <IonIcon icon={checkmarkDoneOutline} slot="start" />Listo
      </IonButton>
    </div>
  );

  // ── CRIBADO: pantalla escanear pallet ──
  const renderCribadoEscaneando = () => (
    <div className="traz-cribado-wrap">
      {/* Cabecera sesión */}
      <div className="traz-cribado-header">
        <IonIcon icon={cutOutline} className="traz-cribado-icon" />
        <div>
          <h3 className="traz-cribado-title">Sesión #{sesionActiva?.id_sesion}</h3>
          <p className="traz-cribado-sub">
            {sesionActiva?.total_cribados ?? 0} pallets cribados · iniciada {sesionActiva?.fecha_inicio}
          </p>
        </div>
      </div>

      {/* Lista pallets cribados */}
      {sesionActiva && sesionActiva.pallets_cribados.length > 0 && (
        <div className="traz-cribado-lista">
          {sesionActiva.pallets_cribados.map((p, i) => (
            <div key={i} className="traz-cribado-pallet-item">
              <IonIcon icon={checkmarkCircleOutline} style={{ color: "#2ecc71" }} />
              <span>{p.codigo_qr}</span>
            </div>
          ))}
        </div>
      )}

      <p className="traz-waiting-sub" style={{ marginTop: 16 }}>
        Escanea el QR del próximo pallet a cribar
      </p>

      <IonButton expand="block" className="traz-scan-btn" onClick={handleScanPalletCribado} disabled={loading}>
        {loading ? <IonSpinner name="crescent" /> : (
          <><IonIcon icon={scanOutline} slot="start" />Escanear pallet</>
        )}
      </IonButton>

      {/* Botones big bag y terminar — solo si hay al menos 1 cribado */}
      {sesionActiva && sesionActiva.total_cribados > 0 && (
        <>
          <IonButton
            expand="block"
            className="traz-bigbag-btn"
            onClick={handleBigBagLleno}
            disabled={loading}
            style={{ marginTop: 10 }}
          >
            <IonIcon icon={bagHandleOutline} slot="start" />
            Big bag lleno
          </IonButton>

          <IonButton
            expand="block"
            fill="outline"
            className="traz-terminar-btn"
            onClick={handleTerminarSesion}
            disabled={loading}
            style={{ marginTop: 8 }}
          >
            <IonIcon icon={stopCircleOutline} slot="start" />
            Terminar sesión de cribado
          </IonButton>
        </>
      )}

      <button className="traz-cancel-btn" onClick={resetFlow}>
        <IonIcon icon={arrowBackOutline} />Volver al inicio
      </button>

      <IonButton
        expand="block"
        color="danger"
        fill="outline"
        onClick={() => setCancelAlertOpen(true)}
        disabled={loading}
        style={{ marginTop: 8 }}
      >
        Cancelar sesión
      </IonButton>
    </div>
  );

  // ── CRIBADO: pallet en proceso ──
  const renderCribadoEnProceso = () => (
    <div className="traz-card">
      <div className="traz-card-header">
        <IonIcon icon={cutOutline} className="traz-card-icon" style={{ color: "var(--color-mid)" }} />
        <div>
          <h3 className="traz-card-title">Pallet en cribado</h3>
          <p className="traz-card-sub">{palletCribandoActual?.codigo_qr}</p>
        </div>
      </div>

      <div className="traz-info-grid" style={{ marginTop: 12 }}>
        <div className="traz-info-row">
          <span className="traz-info-label">Estado actual</span>
          <span className="traz-info-value">Fuera de cámara → en proceso</span>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 20 }}>
        <IonButton
          expand="block"
          className="traz-confirm-btn"
          onClick={handlePalletCribado}
          disabled={loading}
        >
          {loading ? <IonSpinner name="crescent" /> : (
            <><IonIcon icon={checkmarkCircleOutline} slot="start" />Pallet cribado</>
          )}
        </IonButton>

        <IonButton
          expand="block"
          color="medium"
          fill="outline"
          onClick={handleCancelarPalletCribado}
          disabled={loading}
        >
          <IonIcon icon={closeOutline} slot="start" />
          Cancelar cribado
        </IonButton>
      </div>
    </div>
  );

  // ── CRIBADO: big bag creado ──
  const renderCribadoBigBagCreado = () => (
    <div className="traz-result traz-result--success">
      <IonIcon icon={bagHandleOutline} className="traz-result-icon success" />
      <h3 className="traz-result-title">Big bag registrado</h3>
      <div className="traz-info-grid">
        <div className="traz-info-row">
          <span className="traz-info-label">Código lote</span>
          <span className="traz-info-value" style={{ fontWeight: 800 }}>{bigBagResult?.codigo_lote}</span>
        </div>
        <div className="traz-info-row">
          <span className="traz-info-label">Producto</span>
          <span className="traz-info-value">{bigBagResult?.tipo_producto}</span>
        </div>
        <div className="traz-info-row">
          <span className="traz-info-label">Fecha</span>
          <span className="traz-info-value">{bigBagResult?.fecha_produccion}</span>
        </div>
        <div className="traz-info-row">
          <span className="traz-info-label">Destino</span>
          <span className="traz-info-value">{bigBagResult?.destino}</span>
        </div>
      </div>
      <IonButton expand="block" className="traz-done-btn"
        onClick={() => { setBigBagResult(null); setFlow("cribado_escaneando"); }}>
        <IonIcon icon={playOutline} slot="start" />Continuar cribando
      </IonButton>
      <IonButton expand="block" fill="outline" style={{ marginTop: 8 }}
        onClick={handleTerminarSesion} disabled={loading}>
        <IonIcon icon={stopCircleOutline} slot="start" />Terminar sesión
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
          {flow === "lote_activado" && renderLoteActivado()}
          {flow === "cribado_escaneando" && renderCribadoEscaneando()}
          {flow === "cribado_en_proceso" && renderCribadoEnProceso()}
          {flow === "cribado_big_bag_creado" && renderCribadoBigBagCreado()}
        </div>

        {/* Modal fecha salida */}
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
            <IonButton expand="block" fill="clear" onClick={() => setShowCalModal(false)}>Cancelar</IonButton>
          </div>
        </IonModal>

        {/* Alert de confirmación genérico */}
        <IonAlert
          isOpen={alertConfig.isOpen}
          header={alertConfig.header}
          message={alertConfig.message}
          buttons={[
            { text: "Cancelar", role: "cancel", handler: () => setAlertConfig(prev => ({ ...prev, isOpen: false })) },
            {
              text: "Confirmar",
              handler: () => {
                setAlertConfig(prev => ({ ...prev, isOpen: false }));
                alertConfig.onConfirm();
              }
            }
          ]}
          onDidDismiss={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))}
        />


        {/* Alert de cancelacion de sesion de cribado */}
        <IonAlert
          isOpen={cancelAlertOpen}
          header="Cancelar sesión de cribado"
          message="Selecciona el motivo de cancelación"
          buttons={[
            {
              text: "Operario (error humano)",
              handler: async () => {
                await cancelarSesion("operario");
              }
            },
            {
              text: "Mantenimiento",
              handler: async () => {
                await cancelarSesion("mantenimiento");
              }
            },
            {
              text: "Cancelar",
              role: "cancel",
              handler: () => setCancelAlertOpen(false)
            }
          ]}
          onDidDismiss={() => setCancelAlertOpen(false)}
        />

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