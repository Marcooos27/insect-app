import { Redirect, Route } from 'react-router-dom';
import {
  IonApp,
  IonIcon,
  IonLabel,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonTabs,
  setupIonicReact
} from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { home, calendar, barChart, settings, logIn, person} from 'ionicons/icons';

import ProtectedRoute from "./components/ProtectedRoute";


/* Importamos las páginas principales */
import HomePage from './pages/Home/HomePage';
import CalendarPage from './pages/Calendar/CalendarTab';
import DashboardPage from './pages/Dashboard/DashboardPage';
import ManagementsPage from './pages/Management/ManagementPage';
import LoginPage from './pages/Login/LoginPage';
import RegisterPage from './pages/Login/RegisterPage';
import ProfilePage from './pages/Profile/ProfilePage';


/* Importamos los managers */
import ClientesManager from "./pages/Management/ClientesManager";
import PedidosManager from "./pages/Management/PedidosManager";
import OperariosManager from "./pages/Management/OperariosManager";
import LotesManager from "./pages/Management/LotesManager";
import IncubacionManager from "./pages/Management/IncubacionManager";

/* Context providers */
import { OperarioProvider } from './context/OperarioContext';
import { TareaProvider } from './context/TareaContext';
import { CalendarProvider } from "./context/CalendarContext";
import { ManagementProvider } from "./context/ManagementContext";
import { useAuth } from "./context/AuthContext";

/* Core CSS required for Ionic components to work properly */
import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';
import '@ionic/react/css/palettes/dark.system.css';

import './theme/variables.css';

setupIonicReact();


const App: React.FC = () => {
  const { loading, user } = useAuth();

  if (loading) {
    return <div>Cargando...</div>;
  }
  return (
    <IonApp>
      <ManagementProvider>
        <OperarioProvider>
          <TareaProvider>
            <CalendarProvider>
              <IonReactRouter>
                <IonTabs>
                  <IonRouterOutlet>

                    <Route path="/login" component={LoginPage} />
                    <Route path="/register" component={RegisterPage} />
                    
                    {/* Login - Gestión usuarios */}
                    <Route path="/home">
                      <ProtectedRoute>
                        <HomePage />
                      </ProtectedRoute>
                    </Route> 

                    {/* Home - Gestión de tareas */}
                    <Route exact path="/home">
                      <ProtectedRoute>
                        <HomePage />
                      </ProtectedRoute>
                    </Route>

                    {/* Calendario - Hitos y planificación */}
                    <Route exact path="/calendar">
                      <ProtectedRoute>
                        <CalendarPage />
                      </ProtectedRoute>
                    </Route>

                    {/* Dashboard - Empresa y franquiciados */}
                    <Route exact path="/dashboard">
                      <ProtectedRoute>
                        <DashboardPage />
                      </ProtectedRoute>
                    </Route>

                    {/* Managements - Registros, pedidos, diagramas */}
                    <Route exact path="/managements">
                      <ProtectedRoute>
                        <ManagementsPage />
                      </ProtectedRoute>
                    </Route>

                    {/* Perfil */}
                    <Route exact path="/profile">
                      <ProtectedRoute>
                        <ProfilePage />
                      </ProtectedRoute>
                    </Route>

                    {/* Subrutas de management */}
                    <Route path="/management/clientes" component={ClientesManager} exact >
                      <ProtectedRoute>
                        <ClientesManager />
                      </ProtectedRoute>
                    </Route>

                    <Route path="/management/pedidos" component={PedidosManager} exact >
                    <ProtectedRoute>
                        <PedidosManager />
                      </ProtectedRoute>
                    </Route>

                    <Route path="/management/operarios" component={OperariosManager} exact >
                      <ProtectedRoute>
                        <OperariosManager />
                      </ProtectedRoute>
                    </Route>

                    <Route path="/management/lotes" component={LotesManager} exact >
                      <ProtectedRoute>
                        <LotesManager />
                      </ProtectedRoute>
                    </Route>

                    <Route path="/management/incubacion" component={IncubacionManager} exact >
                      <ProtectedRoute>
                        <IncubacionManager />
                      </ProtectedRoute>
                    </Route>


                    {/* Redirección por defecto */}
                    <Route exact path="/">
                      <Redirect to="/login" />
                    </Route>

                    <Redirect exact from="/" to="/login" />
                  </IonRouterOutlet>

                  <IonTabBar slot="bottom">
                    {!user && (
                      <IonTabButton tab="login" href="/login">
                        <IonIcon aria-hidden="true" icon={logIn} />
                        <IonLabel>Login</IonLabel>
                      </IonTabButton>
                    )}

                    <IonTabButton tab="home" href="/home">
                      <IonIcon aria-hidden="true" icon={home} />
                      <IonLabel>Tareas</IonLabel>
                    </IonTabButton>


                    {/* SOLO ADMIN */}
                    {!user ||user?.rol === "admin" && (
                        <IonTabButton tab="calendar" href="/calendar">
                          <IonIcon aria-hidden="true" icon={calendar} />
                          <IonLabel>Calendario</IonLabel>
                        </IonTabButton>
                    )}

                    {user?.rol === "admin" && (
                        <IonTabButton tab="dashboard" href="/dashboard">
                          <IonIcon aria-hidden="true" icon={barChart} />
                          <IonLabel>Gráficos</IonLabel>
                        </IonTabButton>
                    )}

                    {user?.rol === "admin" && (
                        <IonTabButton tab="managements" href="/managements">
                          <IonIcon aria-hidden="true" icon={settings} />
                          <IonLabel>Gestión</IonLabel>
                        </IonTabButton>
                    )}
                    

                    {user && (
                      <IonTabButton tab="Perfil" href="/profile">
                        <IonIcon aria-hidden="true" icon={person} />
                        <IonLabel>Perfil</IonLabel>
                      </IonTabButton>
                    )}
                    
                  </IonTabBar>
                </IonTabs>
              </IonReactRouter>
            </CalendarProvider>
          </TareaProvider>
        </OperarioProvider>
      </ManagementProvider>
    </IonApp>
  );
}

export default App;
