import React, { useEffect, useState } from "react";
import {
  IonPage, IonContent, IonSpinner, IonIcon,
} from "@ionic/react";

import {
  thermometerOutline, waterOutline, wifiOutline,
  arrowBackOutline,
} from "ionicons/icons";

import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import "./DashboardPage.css";

interface CamaraResumen {
  id_camara: number;
  nombre: string;
  capacidad_max: number;
  pallets_dentro: number;
  pallets_vencidos: number;
  temperatura: number | null;
  humedad: number | null;
  ultima_lectura: string | null;
}

interface Pallet {
  id_pallet: number;
  codigo_qr: string;
  dias_en_camara: number;
  fecha_salida_prevista: string;
  estado_ciclo: "en_ciclo" | "vencido";
}

interface DetalleCamara {
  camara: CamaraResumen;
  pallets: Pallet[];
}

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [vista, setVista] = useState<"propias" | "franquiciados">("propias");
  const [camaras, setCamaras] = useState<CamaraResumen[]>([]);
  const [detalle, setDetalle] = useState<DetalleCamara | null>(null);
  const [cargando, setCargando] = useState(true);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);

  useEffect(() => {
    api.get("/dashboard/camaras")
      .then(res => {
        setCamaras(res.data.propias || []);
      })
      .finally(() => setCargando(false));
  }, []);

  const abrirCamara = (id: number) => {
    setCargandoDetalle(true);
    api.get(`/dashboard/camara/${id}/pallets`)
      .then(res => setDetalle(res.data))
      .finally(() => setCargandoDetalle(false));
  };

  const tiempoDesde = (fecha: string | null) => {
    if (!fecha) return null;
    const diff = Math.floor((Date.now() - new Date(fecha).getTime()) / 60000);
    if (diff < 60) return `hace ${diff} min`;
    return `hace ${Math.floor(diff / 60)}h`;
  };

  if (cargando) return (
    <IonPage>
      <IonContent className="dash-content">
        <div className="dash-loading"><IonSpinner name="crescent" /></div>
      </IonContent>
    </IonPage>
  );

  return (
    <IonPage>
      <IonContent className="dash-content">
        <div className="dash-container">

          {/* VISTA DETALLE */}
          {detalle ? (
            <div className="detalle">
              <button className="back-btn" onClick={() => setDetalle(null)}>
                <IonIcon icon={arrowBackOutline} /> Volver
              </button>
              <h2 className="detalle-titulo">{detalle.camara.nombre}</h2>

              {/* Sensores */}
              {detalle.camara.temperatura !== null ? (
                <div className="sensor-row">
                  <div className="sensor-card">
                    <span className="sensor-valor">{detalle.camara.temperatura} ºC</span>
                    <span className="sensor-label">
                      <IonIcon icon={thermometerOutline} /> Temperatura
                    </span>
                  </div>
                  <div className="sensor-card">
                    <span className="sensor-valor">{detalle.camara.humedad}%</span>
                    <span className="sensor-label">
                      <IonIcon icon={waterOutline} /> Humedad
                    </span>
                  </div>
                  <div className="sensor-card">
                    <span className="sensor-valor" style={{ fontSize: "14px" }}>
                      {tiempoDesde(detalle.camara.ultima_lectura)}
                    </span>
                    <span className="sensor-label">
                      <IonIcon icon={wifiOutline} /> Última lectura
                    </span>
                  </div>
                </div>
              ) : (
                <div className="sin-sensor">
                  <IonIcon icon={wifiOutline} />
                  Sin sensor instalado — datos no disponibles
                </div>
              )}

              <div className="leyenda">
                <span className="leyenda-item en-ciclo">En ciclo</span>
                <span className="leyenda-item vencido">Debería salir</span>
                <span className="leyenda-item vacio">Vacío</span>
              </div>

              {/* Grid de pallets */}
              <div className="pallet-grid">
                {detalle.pallets.map(p => (
                  <div
                    key={p.id_pallet}
                    className={`pallet-cell ${p.estado_ciclo === "vencido" ? "vencido" : "en-ciclo"}`}
                  >
                    <span className="pallet-dias">{p.dias_en_camara}d</span>
                    <span className="pallet-id">{p.codigo_qr.replace("PALLET-", "P-")}</span>
                  </div>
                ))}
                {/* Huecos vacíos */}
                {Array.from({
                  length: detalle.camara.capacidad_max - detalle.pallets.length
                }).map((_, i) => (
                  <div key={`empty-${i}`} className="pallet-cell vacio" />
                ))}
              </div>
            </div>
          ) : (

            /* VISTA LISTA */
            <>
              {user?.rol === "admin" && (
                <div className="segmentado">
                  <button
                    className={`seg-btn ${vista === "propias" ? "active" : ""}`}
                    onClick={() => setVista("propias")}
                  >
                    Mis cámaras
                  </button>
                  <button
                    className={`seg-btn ${vista === "franquiciados" ? "active" : ""}`}
                    onClick={() => setVista("franquiciados")}
                  >
                    Franquiciados
                  </button>
                </div>
              )}

              <div className="seccion-label">
                {camaras.length} salas
              </div>

              <div className="cam-grid">
                {cargandoDetalle && (
                  <div className="dash-loading"><IonSpinner name="crescent" /></div>
                )}
                {camaras.map(c => {
                  const pct = Math.round((c.pallets_dentro / c.capacidad_max) * 100);
                  return (
                    <div
                      key={c.id_camara}
                      className="cam-card"
                      onClick={() => abrirCamara(c.id_camara)}
                    >
                      <div className="cam-nombre">{c.nombre}</div>
                      <div className="cam-pills">
                        {c.temperatura !== null ? (
                          <>
                            <span className="pill temp">
                              <IonIcon icon={thermometerOutline} />
                              {c.temperatura} ºC
                            </span>
                            <span className="pill hum">
                              <IonIcon icon={waterOutline} />
                              {c.humedad}%
                            </span>
                          </>
                        ) : (
                          <span className="pill sin-datos">
                            <IonIcon icon={wifiOutline} /> Sin datos
                          </span>
                        )}
                      </div>
                      <div className="cam-barra-bg">
                        <div
                          className="cam-barra-fill"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="cam-meta">
                        {c.pallets_dentro} / {c.capacidad_max} pallets
                        {c.pallets_vencidos > 0 && (
                          <span className="cam-alerta"> · {c.pallets_vencidos} vencidos</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
};

export default DashboardPage;