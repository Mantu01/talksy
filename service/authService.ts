import { appwriteClient, appwriteConfig } from "@/lib/config";
import { Account,ID, OAuthProvider } from "react-native-appwrite";
import {makeRedirectUri} from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

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

  async socialLogin(provider:OAuthProvider){
    try {
      const deepLink = new URL(makeRedirectUri({ 
        scheme:`appwrite-callback-${appwriteConfig.projectId}`
       }));
      const scheme = `${deepLink.protocol}//`;

      const loginUrl= await this.account.createOAuth2Token({
        provider,
        success:`${deepLink}`,
        failure:`${deepLink}`
      });

      if(!loginUrl) throw new Error("Failed to create Login url");

      const result = await WebBrowser.openAuthSessionAsync(`${loginUrl}`, scheme);
      
      if(result.type==='success' && result.url){
        const url = new URL(result.url);
        const secret = url.searchParams.get('secret');
        const userId = url.searchParams.get('userId');

        if(!secret || !userId){
          throw new Error("Oauth failed : Missing Credentials");
        }
        await this.account.createSession({
          userId,
          secret
        });
        return this.getCurrentUser();
      }else{
        throw new Error("Oauth Cancelled or failed");
      }
    } catch (error) {
      console.log("Error while creating accound :: ", error)
    }
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
      await this.account.createEmailPasswordSession({
        email,
        password
      });
      return this.getCurrentUser();
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