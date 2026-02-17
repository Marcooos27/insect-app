import { Redirect } from "react-router";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }: any) {
  const { user, loading } = useAuth();

  if (loading) return null;

  if (!user) return <Redirect to="/login" />;

  return children;
}
