import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Animated, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';

export default function AuthScreen() {
  const navigation = useNavigation<any>();
  const [isLogin, setIsLogin] = useState(true);
  const [rememberMe, setRememberMe] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [registerName, setRegisterName] = useState('');

  const handleAuth = () => {
    // Navigate to DraftScreen on success (pseudo)
    navigation.replace('Draft');
  };

  return (
    <ScrollView className="flex-grow bg-[#1e1e2e]">
      <View className="flex-1 justify-center px-8 min-h-screen">
        <View className="items-center mb-10">
          <Image 
            source={require('../../assets/icon-nobg.png')} 
            className="w-28 h-28 mb-4"
            resizeMode="contain"
          />
          <Text className="text-3xl font-extrabold text-[#cdd6f4]">
            Hoş Geldiniz
          </Text>
          <Text className="text-[#a6adc8] mt-2 text-center text-sm">
            {isLogin ? 'Mireditor hesabınıza giriş yapın.' : 'Mireditor dünyasına katılın ve tasarlamaya başlayın.'}
          </Text>
        </View>

        <View className="bg-[#181825] p-6 rounded-2xl shadow-sm border border-[#313244]">
          {!isLogin && (
            <View className="mb-4">
              <Text className="text-[#cdd6f4] mb-2 font-semibold">Kullanıcı adı</Text>
              <TextInput
                className="bg-[#11111b] h-12 rounded-lg px-4 text-[#cdd6f4] border border-[#313244]"
                placeholder="Kullanıcı adı giriniz..."
                placeholderTextColor="#6c7086"
                value={registerName}
                onChangeText={setRegisterName}
              />
            </View>
          )}

          <View className="mb-4">
            <Text className="text-[#cdd6f4] mb-2 font-semibold">E-posta</Text>
            <TextInput
              autoCapitalize="none"
              keyboardType="email-address"
              className="bg-[#11111b] h-12 rounded-lg px-4 text-[#cdd6f4] border border-[#313244]"
              placeholder="E-posta adresiniz"
              placeholderTextColor="#6c7086"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View className="mb-6">
            <Text className="text-[#cdd6f4] mb-2 font-semibold">Şifre</Text>
            <TextInput
              secureTextEntry
              className="bg-[#11111b] h-12 rounded-lg px-4 text-[#cdd6f4] border border-[#313244]"
              placeholder="Şifreniz"
              placeholderTextColor="#6c7086"
              value={password}
              onChangeText={setPassword}
            />
          </View>

          {isLogin && (
            <View className="flex-row items-center justify-between mb-8">
              <TouchableOpacity
                className="flex-row items-center"
                onPress={() => setRememberMe(!rememberMe)}
              >
                <View className={`w-5 h-5 rounded border items-center justify-center mr-2 ${rememberMe ? 'bg-[#89b4fa] border-[#89b4fa]' : 'border-[#6c7086]'}`}>
                  {rememberMe && <Text className="text-[#11111b] text-xs font-bold">✓</Text>}
                </View>
                <Text className="text-[#a6adc8]">Beni Hatırla</Text>
              </TouchableOpacity>
              <TouchableOpacity>
                <Text className="text-[#89b4fa]">Şifremi Unuttum?</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
             className="bg-[#89b4fa] h-14 rounded-xl justify-center items-center shadow-md active:opacity-80"
             onPress={handleAuth}
          >
            <Text className="text-[#11111b] font-bold text-lg">
              {isLogin ? 'Giriş Yap' : 'Kayıt Ol'}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          className="mt-8 items-center justify-center flex-row"
          onPress={() => setIsLogin(!isLogin)}
        >
          <Text className="text-[#a6adc8]">
            {isLogin ? 'Hesabınız yok mu?' : 'Zaten hesabınız var mı?'}
          </Text>
          <Text className="text-[#89b4fa] font-bold ml-2">
            {isLogin ? 'Kayıt Ol' : 'Giriş Yap'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
