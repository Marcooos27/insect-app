import React, { useState } from "react";
import {
  IonPage, IonContent, IonHeader, IonToolbar, IonTitle,
  IonButton, IonIcon, IonToast, IonSpinner
} from "@ionic/react";
import { scanOutline, qrCodeOutline, checkmarkCircleOutline, closeOutline, warningOutline } from "ionicons/icons";
import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import { API_URL } from "../../services/api";
import "./RegisterQR.css";

// ─────────────────────────────────────────────
// Prefijos de lote huevo conocidos — sincronizar con backend
// ─────────────────────────────────────────────
const PREFIJOS_HUEVO = ["BFS", "TEN"];

const detectarTipo = (valor: string): { tipo: string; conocido: boolean } => {
  const v = valor.trim().toUpperCase();

  if (/^CAMARA-\d+$/.test(v))
    return { tipo: "Cámara", conocido: true };

  if (/^PALLET-\d+$/.test(v))
    return { tipo: "Pallet", conocido: true };

  // Lote huevo: prefijo conocido + número (BFS-00001, TEN-00001)
  const matchHuevo = v.match(/^([A-Z]+)-(\d+)$/);
  if (matchHuevo && PREFIJOS_HUEVO.includes(matchHuevo[1]))
    return { tipo: "Lote de Huevo", conocido: true };

  // Lote alimento: Texto-Texto-...-Número (Salvado-Trigo-0001)
  if (/^[A-Z][A-Z0-9]*(?:-[A-Z][A-Z0-9]*)+\-\d+$/.test(v))
    return { tipo: "Lote de Alimento", conocido: true };

  return { tipo: "Desconocido", conocido: false };
};

// ─────────────────────────────────────────────
// API helper
// ─────────────────────────────────────────────
const apiFetch = async (path: string, options: RequestInit = {}) => {
  const token = localStorage.getItem("token");
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
  try { data = JSON.parse(text); } catch { throw new Error("Respuesta inválida del servidor"); }
  if (!res.ok) throw new Error(data.detail || "Error en la petición");
  return data;
};

// ─────────────────────────────────────────────
// COMPONENTE
// ─────────────────────────────────────────────
const RegisterQRPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [qrValue, setQrValue] = useState<string | null>(null);
  const [tipoDetectado, setTipoDetectado] = useState<{ tipo: string; conocido: boolean } | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastColor, setToastColor] = useState<"success" | "danger" | "warning">("success");

  const showToast = (msg: string, color: "success" | "danger" | "warning" = "success") => {
    setToastMsg(msg);
    setToastColor(color);
  };

  const resetState = () => {
    setQrValue(null);
    setTipoDetectado(null);
    setShowConfirm(false);
  };

  // ─────────────────────────────────────────────
  // ESCANEAR
  // ─────────────────────────────────────────────
  const scanQR = async () => {
    try {
      const { camera } = await BarcodeScanner.requestPermissions();
      if (camera !== "granted" && camera !== "limited") {
        showToast("Permiso de cámara denegado", "danger");
        return;
      }

      const { barcodes } = await BarcodeScanner.scan();
      if (!barcodes || barcodes.length === 0) {
        showToast("No se detectó ningún QR", "warning");
        return;
      }

      const value = barcodes[0].rawValue?.trim();
      if (!value) {
        showToast("QR vacío", "warning");
        return;
      }

      // Verificar si ya existe en BD
      try {
        await apiFetch(`/trazabilidad/scan/${encodeURIComponent(value)}`);
        showToast("Este QR ya está registrado en el sistema", "warning");
        return;
      } catch {
        // 404 → no existe → podemos registrar
      }

      const deteccion = detectarTipo(value);
      setQrValue(value);
      setTipoDetectado(deteccion);
      setShowConfirm(true);

    } catch (err) {
      console.error(err);
      showToast("Error escaneando QR", "danger");
    }
  };

  // ─────────────────────────────────────────────
  // CONFIRMAR REGISTRO
  // ─────────────────────────────────────────────
  const confirmarRegistro = async () => {
    if (!qrValue || !tipoDetectado?.conocido) return;
    try {
      setLoading(true);
      await apiFetch("/trazabilidad/registrar_qr_auto", {
        method: "POST",
        body: JSON.stringify({ codigo_qr: qrValue }),
      });
      setLoading(false);
      showToast(`${tipoDetectado.tipo} registrado correctamente`, "success");
      resetState();
    } catch (err: any) {
      setLoading(false);
      showToast(err.message, "danger");
    }
  };

  // ─────────────────────────────────────────────
  // UI
  // ─────────────────────────────────────────────
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar className="registerqr-toolbar">
          <IonTitle>
            <IonIcon icon={qrCodeOutline} style={{ marginRight: 8 }} />
            Registrar QR
          </IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="registerqr-content">
        <div className="registerqr-container">

          <div className="registerqr-idle-icon-wrap">
            <IonIcon icon={qrCodeOutline} className="registerqr-idle-icon" />
          </div>
          <p className="registerqr-idle-sub">
            Escanea el QR de un pallet, cámara o lote para registrarlo en el sistema
          </p>

          <IonButton
            expand="block"
            className="registerqr-scan-btn"
            onClick={scanQR}
            disabled={loading}
          >
            {loading ? <IonSpinner name="crescent" /> : (
              <><IonIcon icon={scanOutline} slot="start" />Escanear y registrar</>
            )}
          </IonButton>

        </div>

        {/* ── MODAL CONFIRMACIÓN ── */}
        {showConfirm && tipoDetectado && (
          <div className="registerqr-modal-backdrop">
            <div className="registerqr-modal">

              <div className="registerqr-modal-icon-wrap">
                <IonIcon
                  icon={tipoDetectado.conocido ? checkmarkCircleOutline : warningOutline}
                  className={`registerqr-modal-icon ${tipoDetectado.conocido ? "icon-ok" : "icon-warn"}`}
                />
              </div>

              <h3 className="registerqr-modal-title">Confirmar registro</h3>

              <div className="registerqr-modal-info">
                <div className="registerqr-modal-row">
                  <span className="registerqr-modal-label">QR</span>
                  <span className="registerqr-modal-value">{qrValue}</span>
                </div>
                <div className="registerqr-modal-row">
                  <span className="registerqr-modal-label">Tipo</span>
                  <span className={`registerqr-modal-value ${tipoDetectado.conocido ? "" : "value-warn"}`}>
                    {tipoDetectado.tipo}
                  </span>
                </div>
              </div>

              {!tipoDetectado.conocido && (
                <p className="registerqr-modal-warning">
                  El formato de este QR no es reconocido. No se puede registrar.
                </p>
              )}

              <div className="registerqr-modal-actions">
                {tipoDetectado.conocido && (
                  <IonButton
                    expand="block"
                    className="registerqr-confirm-btn"
                    onClick={confirmarRegistro}
                    disabled={loading}
                  >
                    {loading ? <IonSpinner name="crescent" /> : (
                      <><IonIcon icon={checkmarkCircleOutline} slot="start" />Confirmar</>
                    )}
                  </IonButton>
                )}
                <IonButton
                  expand="block"
                  fill="outline"
                  className="registerqr-cancel-btn"
                  onClick={resetState}
                  disabled={loading}
                >
                  <IonIcon icon={closeOutline} slot="start" />
                  {tipoDetectado.conocido ? "Cancelar" : "Cerrar"}
                </IonButton>
              </div>

            </div>
          </div>
        )}

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

export default RegisterQRPage;