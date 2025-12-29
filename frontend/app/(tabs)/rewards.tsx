import { Text, View, StyleSheet, FlatList, Image } from "react-native";




export default function RewardsScreen() {

    const rewards = [
        {id: 1, title: "Rookie", price: 1000, type: "Title"},
        {id: 2, title: "investor", price: 2000, type: "Title"},
        {id: 3, title: "The chosen one", price: 10000, type: "Title"},
        {id: 4, title: "King of Trust", price: 1000000, type: "Title"},
        {id: 5, title: "Amazon $5 gift card", price: 200000, type: "Giftcard"},
        {id: 6, title: "Uber Eats $5 gift card", price: 200000, type: "Giftcard"},
    ]
    
    const rewardType =  {
        Title: require("../../assets/images/rewards/title-reward-icon.png"),
        Giftcard: require("../../assets/images/rewards/giftcard-reward-icon.png"),
    };
    
  return (

    <FlatList
        data={rewards}
        style={{ width: '100%' }}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        contentContainerStyle={styles.container}
        renderItem={({ item }) => (
        <View style={styles.rewardItem}>
            <Text style={styles.rewardTitle}>{item.type}</Text>
            <Image style={{ width:60, height:60,tintColor: "white"}} 
            source={rewardType[item.type as keyof typeof rewardType]}/>
            <Text style={styles.rewardTitle}>{item.title}</Text>

        </View>
        )}
    />

  );
}


const styles = StyleSheet.create({
    container:{
        backgroundColor:"black",
        flex:1,
        justifyContent:"center",
        alignItems:"center"
    },
    rewardItem:{
        borderWidth:2,
        alignItems:"center",

        margin:15,
        width:150,
        height:130,
        borderRadius:8,

        borderColor:"white"
    },
    rewardTitle:{
        fontWeight: "bold",
        color:"white",
        textAlign:"center",
        padding:4
    }
})

// sources
// dynamic image selection using GPT5
// https://chatgpt.com/share/6952d5b6-e13c-800a-ae42-0888bca6bb68