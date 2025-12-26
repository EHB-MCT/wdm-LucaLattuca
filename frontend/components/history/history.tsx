
import { Text, StyleSheet, View, ViewStyle } from "react-native";
import { FlatList } from "react-native";

// dynamic comoponent styling props 
type HistoryScroll = {
    scrollEnabled?: boolean,
    containerStyle?: ViewStyle;
};

export default function History({scrollEnabled = true, containerStyle}: HistoryScroll) {

    const matches = [
        { id: 1, opponent: "Player A", result: "Win" },
        { id: 2, opponent: "Player B", result: "Loss" },
        { id: 3, opponent: "Player C", result: "Win" },
    ];

    return (
        <View style={[styles.history, containerStyle]}>
            <Text style={styles.textStyle}>History</Text>
            <FlatList
                data={matches}
                scrollEnabled={scrollEnabled}
                style={{ width: '100%' }}
                keyExtractor={(match) => match.id.toString()}
                renderItem={({ item }) => (
                 <View style={styles.match}>
                    <Text>{item.opponent} - {item.result}</Text>
                  </View>
                )}
            contentContainerStyle={styles.matchList}
        />
        </View>

    )

}

const styles = StyleSheet.create({
    textStyle: {
        color: 'black',
    },
    history: {
        backgroundColor: 'white',
        alignItems: "center",
        width: '90%',
        // height: '40%',
        borderRadius: 10,
    },
    matchList: {
        width: '90%',
        alignSelf: "center",
    },
    match: {
        padding: 10,
        height: 80,
        borderWidth: 1,
        borderColor: '#000000ff',
        borderRadius: 10,
        marginBottom: 10,
        alignItems: "center",
    }
})

// Sources
// FlatList: https://chatgpt.com/share/694d9388-8240-800a-bff4-f83cfb9a45a1
