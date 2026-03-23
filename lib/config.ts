import {Client} from "react-native-appwrite";

export const appwriteConfig={
  projectId:process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID!,
  projectName:process.env.EXPO_PUBLIC_APPWRITE_PROJECT_NAME!,
  endpointUrl:process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT!,
  platform:process.env.EXPO_PUBLIC_APPWRITE_PLATFORM!,
  databaseId:process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!,
  collections:{
    userTableId:process.env.EXPO_PUBLIC_APPWRITE_USER_TABLE_ID!,
  }
}

export const appwriteClient=new Client();