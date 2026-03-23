import AuthService from "@/service/authService";
import { router, usePathname } from "expo-router";
import { createContext, FC, PropsWithChildren, useContext, useEffect, useMemo, useState } from "react";
import { Models, OAuthProvider } from "react-native-appwrite";

type User = Models.User & {
  rowId:string,
  avatar?:string,
  banner?:string,
}

type AuthContextProps = {
  auth:AuthService,
  name:string,
  email:string,
  password:string,
  loading:boolean,
  user:User | undefined,

  setName:(name:string)=>void,
  setEmail:(email:string)=>void,
  setPassword:(password:string)=>void,
  handleSignUp:()=>void;
  handleSignIn:()=>void;
  handleLogout:()=>void;
  handleSocialLogin:(provder:OAuthProvider)=>void;
  updateUser:()=>void;
};

const publicRoutes=['/login','/signup'];
const protectedRoutes=['/chat'];

const AuthContext=createContext<AuthContextProps | null>(null);

const AuthProvider: FC<PropsWithChildren> = ({ children }) => {

  const auth=useMemo(()=>new AuthService(),[]);
  const pathName=usePathname();

  const [loading,setLoding]=useState<boolean>(false);
  const [name,setName]=useState<string>('');
  const [email,setEmail]=useState<string>('');
  const [password,setPassword]=useState<string>('');
  const [user,setUser]=useState<User | undefined>(undefined);

  useEffect(()=>{
    async function fetchCurrentUser() {
      try {
        const userData=await auth.getCurrentUser();
        setUser(userData);
      } catch (error) {
        console.log("Error in fetching logged in user :: authcontext ::", error);
      }
    }
    fetchCurrentUser();
  },[]);

  useEffect(()=>{
    if(loading) return ;

    if(user && publicRoutes.includes(pathName)){
      router.push('/');
    }

    if(!user && protectedRoutes.includes(pathName)){
      router.push('/login');
    }
  },[user,pathName,router,loading]);

  const handleSignUp=async()=>{
    if(!name || !email || !password){
      return ;
    }
    setLoding(true);
    try {
      await auth.signup({name,email,password});
      router.push('/login');
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
      const userData=await auth.login({email,password});
      setUser(userData);
      router.push('/')
    } catch (error) {
      console.log("Error in signup :: authcontext :: ", error)
    }finally{
      setLoding(false);
    }
  };

  const handleSocialLogin=async(provder:OAuthProvider)=>{
    try {
      const user=await auth.socialLogin(provder);
      setUser(user);
      router.push('/');
    } catch (error) {
      console.log("Error in logout :: authcontext :: ",error);
    }
  }

  const handleLogout=async()=>{
    try {
      await auth.logout();
      setUser(undefined);
      router.push('/login');
    } catch (error) {
      console.log("Error in logout :: authcontext :: ",error);
    }
  }

  const updateUser=async()=>{
    if(!name || !user)  return;
    setLoding(true);
    try {
      const userData= await auth.updateUser({name,rowId:user.rowId});
      setUser(userData);
    } catch (error) {
      console.log("Error updating user :: authcontext :: ",error);
    }finally{
      setLoding(false);
    }
  }

  return (
    <AuthContext.Provider
      value={{
        auth,
        loading,
        name,
        setName,
        email,
        user,
        setEmail,
        password,
        setPassword,
        handleSignUp,
        handleSignIn,
        handleLogout,
        handleSocialLogin,
        updateUser,
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