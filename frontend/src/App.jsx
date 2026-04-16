import AppRoutes from "./routes/AppRoutes";
import { ToastContainer } from "react-toastify";
import { useTheme } from "./hooks/useTheme";

function App() {
  const { theme } = useTheme();

  return (
    <>
      <AppRoutes />
      <ToastContainer
        position="top-right"
        autoClose={3200}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnHover
        draggable
        theme={theme}
      />
    </>
  );
}

export default App;
