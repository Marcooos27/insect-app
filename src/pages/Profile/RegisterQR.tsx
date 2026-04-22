import React, { useState } from "react";
import {
  IonPage, IonContent, IonHeader, IonToolbar, IonTitle,
  IonButton, IonIcon, IonToast, IonSpinner, IonModal
} from "@ionic/react";
import { scanOutline, qrCodeOutline, checkmarkCircleOutline, closeOutline } from "ionicons/icons";
import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import { API_URL } from "../../services/api";
import "./RegisterQR.css";

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

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("Respuesta inválida del servidor");
  }

  if (!res.ok) {
    throw new Error(data.detail || "Error en la petición");
  }

  return data;
};

// ─────────────────────────────────────────────
// COMPONENTE
// ─────────────────────────────────────────────
const RegisterQRPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [qrValue, setQrValue] = useState<string | null>(null);
  const [tipoDetectado, setTipoDetectado] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const [toastMsg, setToastMsg] = useState("");
  const [toastColor, setToastColor] = useState<"success" | "danger" | "warning">("success");

  const showToast = (msg: string, color: "success" | "danger" | "warning" = "success") => {
    setToastMsg(msg);
    setToastColor(color);
  };

  // ─────────────────────────────────────────────
  // ESCANEAR QR
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

      setQrValue(value);

      // ─────────────────────────────────────────
      // VALIDAR SI YA EXISTE
      // ─────────────────────────────────────────
      try {
        await apiFetch(`/trazabilidad/scan/${encodeURIComponent(value)}`);
        showToast("Este QR ya está registrado", "danger");
        setQrValue(null);
        return;
      } catch (err: any) {
        // Si es 404 → OK, no existe
      }

      // ─────────────────────────────────────────
      // DETECTAR TIPO AUTOMÁTICAMENTE
      // ─────────────────────────────────────────
      let tipo = null;

      if (value.startsWith("CAMARA-")) tipo = "Cámara";
      else if (value.startsWith("PALLET-")) tipo = "Pallet";
      else if (value.startsWith("LO-AL-")) tipo = "Lote de Alimento";
      else if (value.startsWith("LO-HU-")) tipo = "Lote de Huevo";

      setTipoDetectado(tipo);
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
    if (!qrValue) return;

    try {
      setLoading(true);

      await apiFetch("/trazabilidad/registrar_qr_auto", {
        method: "POST",
        body: JSON.stringify({
          codigo_qr: qrValue
        }),
      });

      setLoading(false);
      setShowConfirm(false);
      showToast("QR registrado correctamente", "success");

      setQrValue(null);
      setTipoDetectado(null);

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

          {qrValue && (
            <div className="registerqr-result">
              <p><strong>QR leído:</strong></p>
              <p className="qr-text">{qrValue}</p>
            </div>
          )}

          <IonButton
            expand="block"
            className="registerqr-scan-btn"
            onClick={scanQR}
            disabled={loading}
          >
            {loading ? <IonSpinner /> : (
              <>
                <IonIcon icon={scanOutline} slot="start" />
                Registrar QR
              </>
            )}
          </IonButton>

        </div>

        {/* ───────────── MODAL CONFIRMACIÓN ───────────── */}
        {showConfirm && (
          <div className="registerqr-modal-backdrop">
            <div className="registerqr-modal">

              <h3 className="registerqr-modal-title">
                Confirmar registro
              </h3>

              <p className="registerqr-modal-text">
                <strong>QR:</strong><br /> {qrValue}
              </p>

              <p className="registerqr-modal-text">
                <strong>Tipo:</strong> {tipoDetectado || "Desconocido"}
              </p>

              {!tipoDetectado && (
                <p className="warning-text">
                  ⚠️ No se pudo detectar el tipo automáticamente
                </p>
              )}

              <div className="registerqr-modal-actions">
                <IonButton
                  className="registerqr-confirm-btn"
                  onClick={confirmarRegistro}
                >
                  Confirmar
                </IonButton>

                <IonButton
                  className="registerqr-cancel-btn"
                  onClick={() => setShowConfirm(false)}
                >
                  Cancelar
                </IonButton>
              </div>

            </div>
          </div>
        )}

        {/* ───────────── TOAST ───────────── */}
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