import { appwriteClient, appwriteConfig } from "@/lib/config";
import { Account,ID, OAuthProvider,Query,TablesDB } from "react-native-appwrite";
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
  private table;

  constructor(){
    appwriteClient
      .setEndpoint(appwriteConfig.endpointUrl)
      .setProject(appwriteConfig.projectId)
      .setPlatform(appwriteConfig.platform)

    this.account=new Account(appwriteClient);
    this.table=new TablesDB(appwriteClient);
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
      await this.table.createRow({
        databaseId:appwriteConfig.databaseId,
        tableId:appwriteConfig.collections.userTableId,
        rowId:ID.unique(),
        data:{
          userId:newUser.$id,
          name:newUser.name,
          email:newUser.email,
        }
      });
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
      const currentUser=await this.account.get();
      if(!currentUser)  return ;
      
      const result=await this.table.listRows({
        databaseId:appwriteConfig.databaseId,
        tableId:appwriteConfig.collections.userTableId,
        queries:[Query.equal('userId',currentUser.$id)],
        total:false
      });
      const dbUser=result.rows[0];
      return {
        ...currentUser,
        rowId:dbUser.$id,
        avatar:dbUser.avatar,
        banner:dbUser.banner,
      }
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

  async updateUser({name,rowId}:{name:string,rowId:string}){
    try {
      const user=await this.account.updateName({name});
      await this.table.updateRow({
        databaseId:appwriteConfig.databaseId,
        tableId:appwriteConfig.collections.userTableId,
        rowId,
        data:{
          name
        }
      });
      return {
        ...user,
        userId:user.$id,
        rowId
      }
    } catch (error) {
      console.log("error updating user ::",error);
    }
  }
}

export default AuthService;