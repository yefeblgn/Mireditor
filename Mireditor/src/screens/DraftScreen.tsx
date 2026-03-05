import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Animated, Image } from 'react-native';

export default function DraftScreen() {
  return (
    <View className="flex-1 bg-[#11111b] p-8 flex-row">
      <View className="flex-1 pr-6 border-r border-[#313244]">
        <View className="flex-row items-center justify-between mb-8">
          <View className="flex-row items-center">
            <Image 
              source={require('../../assets/icon-nobg.png')} 
              className="w-10 h-10 mr-3"
              resizeMode="contain"
            />
            <Text className="text-[#cdd6f4] text-3xl font-bold">Mireditor</Text>
          </View>
          <View className="flex-row items-center">
             <View className="w-10 h-10 bg-[#f38ba8] rounded-full justify-center items-center mr-3">
               <Text className="text-white font-bold text-lg">E</Text>
             </View>
             <Text className="text-[#a6adc8] font-medium">Efe Bilgin</Text>
          </View>
        </View>

        <Text className="text-[#cdd6f4] text-xl font-semibold mb-6">Son Projeler</Text>
        <ScrollView className="space-y-4">
          {[1,2,3].map((val) => (
            <TouchableOpacity key={val} className="bg-[#181825] p-5 rounded-xl border border-[#313244] flex-row items-center mb-3 group active:bg-[#313244]">
              <View className="w-12 h-12 bg-[#89b4fa] rounded-lg items-center justify-center mr-4">
                <Text className="text-[#11111b] font-bold">.gef</Text>
              </View>
              <View>
                <Text className="text-[#cdd6f4] text-lg font-medium">Proje_Taslak_0{val}</Text>
                <Text className="text-[#6c7086] text-sm">Düzenlenme: Bugün 14:32</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View className="w-80 pl-8 pt-16">
        <Text className="text-[#cdd6f4] text-xl font-semibold mb-6">Başla</Text>
        <View className="space-y-4">
          <TouchableOpacity className="bg-[#181825] border border-[#f38ba8] p-5 rounded-xl justify-center items-center shadow-sm active:bg-[#f38ba8]/20">
            <Text className="text-[#f38ba8] text-lg font-bold text-center">Tasarım Oluştur</Text>
            <Text className="text-[#cdd6f4]/60 text-sm mt-1">Yepyeni bir boş tuval</Text>
          </TouchableOpacity>
          
          <TouchableOpacity className="bg-[#181825] border border-[#a6e3a1] p-5 rounded-xl mt-4 justify-center items-center shadow-sm active:bg-[#a6e3a1]/20">
            <Text className="text-[#a6e3a1] text-lg font-bold text-center">Görsel Yükle</Text>
            <Text className="text-[#cdd6f4]/60 text-sm mt-1">Bilgisayarından resim seç</Text>
          </TouchableOpacity>

          <TouchableOpacity className="bg-[#181825] border border-[#89b4fa] p-5 rounded-xl mt-4 justify-center items-center shadow-sm active:bg-[#89b4fa]/20">
            <Text className="text-[#89b4fa] text-lg font-bold text-center">Projeyi Aç</Text>
            <Text className="text-[#cdd6f4]/60 text-sm mt-1">Var olan .gef dosyasını seç</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
