import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Button, Card, IconButton, Text, TextInput } from "react-native-paper";

interface Plate {
  id: string;
  number: string;
  image?: string;
  createdAt: number;
}

export default function App() {
  const samplePlates: Plate[] = [
  {
    id: "1",
    number: "30F-25658",
    image: undefined,
    createdAt: Date.now() - 1000000,
  },
  {
    id: "2",
    number: "29A-12345",
    image: undefined,
    createdAt: Date.now() - 500000,
  },
  {
    id: "3",
    number: "81B-67890",
    image: undefined,
    createdAt: Date.now() - 200000,
  },
];
  const [plate, setPlate] = useState("");
  const [image, setImage] = useState<string | undefined>();
  const [plates, setPlates] = useState<Plate[]>(samplePlates);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const normalizeText = (text: string) => {
    return text
    .toUpperCase()
    .replace(/\s/g, "")             // bỏ khoảng trắng
    .replace(/[.,]/g, "")           // bỏ dấu chấm
    .replace(/[•·–—_]/g, "-");      // convert các ký tự lạ thành -
  };

  const recognizePlate = async (imageUri: string) => {
    const formData = new FormData();
    formData.append("file", {
      uri: imageUri,
      name: "plate.jpg",
      type: "image/jpeg",
    } as any);

    const res = await fetch("https://api.ocr.space/parse/image", {
      method: "POST",
      headers: {
        apikey: "K81060779188957",
      },
      body: formData,
    });

    const data = await res.json();

    const text = data?.ParsedResults?.[0]?.ParsedText || "";
    const singleLine = text.replace(/\n/g, "");
    const cleanText = normalizeText(singleLine);

    const match = cleanText.match(/[0-9]{2}-?[A-Z]{1,2}-?[0-9]{3,5}/); 
    console.log("Text: ", match)
    
    if (match) {
      setPlate(match[0]);
    } else {
      Alert.alert("Không nhận diện được biển số");
    }
  };

  const loadData = async () => {
    const data = await AsyncStorage.getItem("plates");
    if (data) setPlates(JSON.parse(data));
  };

  const saveData = async (data: Plate[]) => {
    setPlates(data);
    await AsyncStorage.setItem("plates", JSON.stringify(data));
  };

  const pickImage = async () => {
    const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
    const mediaPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (
      cameraPermission.status !== "granted" ||
      mediaPermission.status !== "granted"
    ) {
      Alert.alert(
        "Thiếu quyền",
        "Vui lòng cấp quyền camera để sử dụng tính năng này"
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.5,
      allowsEditing: true,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setImage(uri);
      recognizePlate(uri);
    }
  };

  const checkPlate = () => {
    const exist = plates.find((x) => x.number === plate);
    Alert.alert(
      "Kết quả",
      exist ? "✅ Biển số đã tồn tại" : "❌ Biển số chưa tồn tại"
    );
  };

  const addOrUpdate = () => {
    if (!plate) return;

    if (editingId) {
      const updated = plates.map((x) =>
        x.id === editingId ? { ...x, number: plate, image } : x
      );
      saveData(updated);
      setEditingId(null);
    } else {
      const newItem: Plate = {
        id: Date.now().toString(),
        number: plate,
        image,
        createdAt: Date.now(),
      };
      saveData([newItem, ...plates]);
    }

    setPlate("");
    setImage(undefined);
  };

  const editPlate = (item: Plate) => {
    setPlate(item.number);
    setImage(item.image);
    setEditingId(item.id);
  };

  const deletePlate = (id: string) => {
    saveData(plates.filter((x) => x.id !== id));
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🚗 License Plate Demo</Text>

      <Button
        icon="camera"
        mode="contained"
        onPress={pickImage}
        style={styles.captureButton}
        contentStyle={{ flexDirection: "row-reverse" }}
      >
        Chụp biển số
      </Button>

      {image && (
        <Card style={styles.imageCard}>
          <Image source={{ uri: image }} style={styles.image} />
        </Card>
      )}

      <TextInput
        label="Nhập biển số"
        value={plate}
        onChangeText={setPlate}
        style={styles.input}
        mode="outlined"
        outlineColor="#888"
        activeOutlineColor="#6200ee"
      />

      <View style={styles.row}>
        <Button
          mode="outlined"
          onPress={checkPlate}
          style={styles.smallButton}
        >
          Kiểm tra
        </Button>
        <Button
          mode="contained"
          onPress={addOrUpdate}
          style={styles.smallButton}
        >
          {editingId ? "Cập nhật" : "Thêm"}
        </Button>
      </View>

      <FlatList
        data={plates}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 100 }}
        scrollEnabled={false}
        renderItem={({ item }) => (
          <Card style={styles.card} elevation={4}>
            <View style={styles.cardContent}>
              {item.image && (
                <Image source={{ uri: item.image }} style={styles.cardImage} />
              )}
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.plateText}>{item.number}</Text>
                <Text style={styles.dateText}>
                  {new Date(item.createdAt).toLocaleString()}
                </Text>
              </View>
              <View style={styles.cardButtons}>
                <IconButton
                  icon="pencil"
                  size={24}
                  onPress={() => editPlate(item)}
                />
                <IconButton
                  icon="delete"
                  size={24}
                  onPress={() => deletePlate(item.id)}
                />
              </View>
            </View>
          </Card>
        )}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f2f4f7",
    marginTop: 50
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
    color: "#6200ee",
  },
  captureButton: {
    marginBottom: 15,
    borderRadius: 12,
  },
  imageCard: {
    marginVertical: 10,
    borderRadius: 16,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: 200,
    resizeMode: "cover",
  },
  input: {
    marginVertical: 10,
    backgroundColor: "#fff",
    borderRadius: 12,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  smallButton: {
    flex: 0.48,
    borderRadius: 12,
  },
  card: {
    marginVertical: 8,
    borderRadius: 16,
    backgroundColor: "#fff",
    padding: 10,
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardImage: {
    width: 80,
    height: 60,
    borderRadius: 8,
  },
  plateText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  dateText: {
    fontSize: 12,
    color: "#888",
    marginTop: 4,
  },
  cardButtons: {
    flexDirection: "row",
  },
});
