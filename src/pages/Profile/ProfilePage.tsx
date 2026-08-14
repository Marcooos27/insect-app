import {
  IonPage,
  IonContent,
  IonButton,
  IonIcon,
  IonPopover,
  IonToast,
  IonSpinner
} from "@ionic/react";

import {
  personCircleOutline,
  mailOutline,
  shieldOutline,
  logOutOutline,
  qrCodeOutline,
  ellipsisVerticalOutline,
  warningOutline,
  documentTextOutline
} from "ionicons/icons";

import { useAuth } from "../../context/AuthContext";
import { useContext } from "react";
import { OperarioContext } from "../../context/OperarioContext";
import { useHistory } from "react-router";
import React, { useState } from 'react';
import { API_URL } from "../../services/api";
import "./ProfilePage.css";

const MESES_ES = [
  "", "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
  "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"
];

const Profile: React.FC = () => {
  const { user, logout } = useAuth();
  const { operarios } = useContext(OperarioContext);
  const history = useHistory();
  const [showPopover, setShowPopover] = useState(false);
  const [popoverEvent, setPopoverEvent] = useState<MouseEvent | undefined>(undefined);
  const [exportandoAppcc, setExportandoAppcc] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastColor, setToastColor] = useState<"success" | "danger">("success");

  const nombreOperario =
    operarios.find(op => op.id_operario === user?.id_operario)?.nombre ?? "—";

  const handleExportarAppcc = async () => {
    if (exportandoAppcc) return;
    setExportandoAppcc(true);
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const token = localStorage.getItem("token");

      const res = await fetch(`${API_URL}/appcc/exportar/${year}/${month}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        let detail = "Error exportando el APPCC";
        try {
          const data = await res.json();
          detail = data.detail || detail;
        } catch { /* respuesta no era JSON */ }
        throw new Error(detail);
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `APPCC_${MESES_ES[month]}_${year}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setToastColor("success");
      setToastMsg("APPCC exportado correctamente");
    } catch (err: any) {
      setToastColor("danger");
      setToastMsg(err.message || "Error exportando el APPCC");
    } finally {
      setExportandoAppcc(false);
    }
  };

  return (
    <IonPage>
      <IonContent className="profile-content">

        {/* HEADER */}
        <div className="profile-header">
          <IonIcon icon={personCircleOutline} className="profile-avatar" />
          <h2 className="profile-username">{nombreOperario}</h2>

          {/* BOTÓN MENU ARRIBA DERECHA */}
            <IonButton
              fill="clear"
              className="profile-menu-btn"
              onClick={(e) => {
                setPopoverEvent(e.nativeEvent); // 🔥 clave
                setShowPopover(true);
              }}
            >
              <IonIcon icon={ellipsisVerticalOutline} />
            </IonButton>
        </div>

        {/* BOTÓN INCIDENCIA (FLOATING) */}
          <IonButton
            className="profile-danger-fab"
            fill="clear"
            onClick={() => history.push("/incidencias")}
          >
            <IonIcon icon={warningOutline} />
          </IonButton>

          

        {/* POPUP MENU */}
        <IonPopover
          isOpen={showPopover}
          event={popoverEvent}          // 🔥 esto lo posiciona
          reference="event"             // 🔥 obligatorio
          onDidDismiss={() => setShowPopover(false)}
          side="bottom"
          alignment="end"
        >
          <div className="profile-popover">

            <div
              className="profile-popover-item"
              onClick={() => {
                setShowPopover(false); // cerrar
                history.push("/registrar-qr");
              }}
            >
              <IonIcon icon={qrCodeOutline} />
              <span>Registrar QR</span>
            </div>

          </div>
        </IonPopover>

        {/* DATOS USUARIO */}
        <div className="profile-card">
          <div className="profile-row">
            <IonIcon icon={mailOutline} className="profile-row-icon" />
            <div className="profile-row-info">
              <span className="profile-row-label">Email</span>
              <span className="profile-row-value">{user?.email}</span>
            </div>
          </div>

          <div className="profile-divider" />

          <div className="profile-row">
            <IonIcon icon={shieldOutline} className="profile-row-icon" />
            <div className="profile-row-info">
              <span className="profile-row-label">Rol</span>
              <span className="profile-row-value">
                {user?.rol === "admin" ? "Administrador" : "Operario"}
              </span>
            </div>
          </div>
        </div>

        {/* EXPORTAR APPCC (solo admin) */}
        {user?.rol === "admin" && (
          <div className="profile-appcc">
            <IonButton
              expand="block"
              className="profile-appcc-btn"
              onClick={handleExportarAppcc}
              disabled={exportandoAppcc}
            >
              {exportandoAppcc ? <IonSpinner name="crescent" /> : (
                <>
                  <IonIcon icon={documentTextOutline} slot="start" />
                  Exportar APPCC (mes actual)
                </>
              )}
            </IonButton>
          </div>
        )}

        {/* LOGOUT */}
        <div className="profile-logout">
          <IonButton
            expand="block"
            className="profile-logout-btn"
            onClick={logout}
          >
            <IonIcon icon={logOutOutline} slot="start" />
            Cerrar sesión
          </IonButton>
        </div>

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
}

export default Profile;