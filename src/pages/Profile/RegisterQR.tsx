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

      if (value.startsWith("CAM-")) tipo = "Cámara";
      else if (value.startsWith("PAL-")) tipo = "Pallet";
      else if (value.startsWith("LA-")) tipo = "Lote de Alimento";
      else if (value.startsWith("LH-")) tipo = "Lote de Huevo";

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
        <IonToolbar>
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
        <IonModal isOpen={showConfirm} onDidDismiss={() => setShowConfirm(false)}>
          <div className="confirm-modal">

            <IonIcon icon={checkmarkCircleOutline} className="confirm-icon" />

            <h2>Confirmar registro</h2>

            <p><strong>QR:</strong> {qrValue}</p>

            <p>
              <strong>Tipo detectado:</strong>{" "}
              {tipoDetectado || "Desconocido"}
            </p>

            {!tipoDetectado && (
              <p className="warning-text">
                ⚠️ No se pudo detectar el tipo automáticamente
              </p>
            )}

            <IonButton
              expand="block"
              color="success"
              onClick={confirmarRegistro}
              disabled={loading}
            >
              {loading ? <IonSpinner /> : "Confirmar"}
            </IonButton>

            <IonButton
              expand="block"
              fill="clear"
              onClick={() => setShowConfirm(false)}
            >
              <IonIcon icon={closeOutline} slot="start" />
              Cancelar
            </IonButton>

          </div>
        </IonModal>

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