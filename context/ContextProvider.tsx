import { PropsWithChildren } from "react";
import AuthProvider from "./AuthContext";

const Provider=({children}:PropsWithChildren)=>{
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
}

export default Provider;