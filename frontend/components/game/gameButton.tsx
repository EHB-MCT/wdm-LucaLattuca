import {  Pressable, StyleSheet,Text, View } from "react-native";
import React from "react";
import { Redirect } from "expo-router";
export default function GameButton() {
    function joinQueue() {
        console.log("Queue joined");
    }

    return (
        <Pressable
                onPress={joinQueue}
                style={({pressed})  => [
                    styles.button,
                    pressed && styles.pressed,
                ]
                }
                accessibilityLabel="Join Game Queue"
            >
                <Text style={styles.buttonText}>Play</Text>
            </Pressable>
        
    );
}

const styles = StyleSheet.create({
    button: {
        margin: 20,
        width: 120,
        height: 120,
        top: 60,

        borderWidth: 3,
        borderRadius: 75, 
        borderColor: 'white',
        justifyContent: 'center', 
        alignItems: 'center',    
        backgroundColor: '#ffe556ff',



    },
    buttonText: {
        color: 'black',
        fontWeight: 'bold',
        fontSize: 24,
    },
    pressed: {
        top: 2,
    }
})
