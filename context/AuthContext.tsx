import AuthService from "@/service/authService";
import { createContext, FC, PropsWithChildren, useContext, useMemo, useState } from "react";

type AuthContextProps = {
  auth:AuthService,
  name:string,
  email:string,
  password:string,
  loading:boolean,

  setName:(name:string)=>void,
  setEmail:(email:string)=>void,
  setPassword:(password:string)=>void,
  handleSignUp:()=>void;
  handleSignIn:()=>void;
};

const AuthContext=createContext<AuthContextProps | null>(null);

const AuthProvider: FC<PropsWithChildren> = ({ children }) => {

  const auth=useMemo(()=>new AuthService(),[])

  const [loading,setLoding]=useState<boolean>(false);
  const [name,setName]=useState<string>('');
  const [email,setEmail]=useState<string>('');
  const [password,setPassword]=useState<string>('');

  const handleSignUp=async()=>{
    if(!name || !email || !password){
      return ;
    }
    setLoding(true);
    try {
      const user=await auth.signup({name,email,password});
      console.log(user)
    } catch (error) {
      console.log("Error in signup :: authcontext :: ", error)
    }finally{
      setLoding(false);
    }
  };

  const handleSignIn=async()=>{
    if(!email || !password){
      return ;
    }
    setLoding(true);
    try {
      const user=await auth.login({email,password});
      console.log(user)
    } catch (error) {
      console.log("Error in signup :: authcontext :: ", error)
    }finally{
      setLoding(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        auth,
        loading,
        name,
        setName,
        email,
        setEmail,
        password,
        setPassword,
        handleSignUp,
        handleSignIn
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export default AuthProvider;

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }
  return context;
};