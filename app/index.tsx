import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useAuth } from '@/context/AuthContext';
import { router } from 'expo-router';
import { View } from 'react-native';

export default function Home() {

  const {user,handleLogout}=useAuth();

  return (
    <View className="flex-1 items-center justify-center bg-background">
      <View className="items-center gap-2 mb-12">
        <Text className="text-5xl font-bold text-foreground">Talksy</Text>
        <Text className="text-lg text-muted-foreground">Connect instantly</Text>
      </View>
      <View className="w-full px-8 gap-4">
        {user?(
          <>
            <Button onPress={() => router.push('/profile')} size="lg" className="rounded-full">
              <Text className="font-semibold text-base">Profile</Text>
            </Button>
            <Button onPress={() => router.push('/chat')} size="lg" className="rounded-full">
              <Text className="font-semibold text-base">Start chatting</Text>
            </Button>
            <Button onPress={() => router.push('/explore')} size="lg" className="rounded-full">
              <Text className="font-semibold text-base">Start chatting</Text>
            </Button>
            <Button onPress={handleLogout} variant="destructive" size="lg" className="rounded-full">
              <Text className="font-semibold text-base">Logout</Text>
            </Button>
          </>
        ):(
          <Button onPress={() => router.push('/login')} variant="outline" size="lg" className="rounded-full">
            <Text className="font-semibold text-base">Login</Text>
          </Button>
        )}
      </View>
      <Text className="absolute bottom-8 text-xs text-muted-foreground">secure messaging</Text>
    </View>
  );
}