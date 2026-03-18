import { appwriteClient, appwriteConfig } from "@/lib/config";
import { Account,ID } from "react-native-appwrite";

type SignUp={
  name:string;
  email:string;
  password:string;
}

type Login={
  email:string;
  password:string;
}

class AuthService{
  private account;

  constructor(){
    appwriteClient
      .setEndpoint(appwriteConfig.endpointUrl)
      .setProject(appwriteConfig.projectId)
      .setPlatform(appwriteConfig.platform)

    this.account=new Account(appwriteClient);
  }

  async signup({name,email,password}:SignUp){
    try {
      const newUser=await this.account.create({
        userId:ID.unique(),
        name,
        email,
        password
      });
      return newUser;
    } catch (error) {
      console.log("Error while creating accound :: ", error)
    }
  }

  async login({email,password}:Login){
    try {
      const user=await this.account.createEmailPasswordSession({
        email,
        password
      });
      return user;
    } catch (error) {
      console.log("Error while login ::",error);
    }
  }

  async getCurrentUser(){
    try {
      return this.account.get();
    } catch (error) {
      console.log("Error while getting logged in user ::",error);
    }
  }

  async logout(){
    try {
      return this.account.deleteSession('current');
    } catch (error) {
      console.log("error while logging out ::",error);
    }
  }
}

export default AuthService;