import { Pressable, StyleSheet, Text, ActivityIndicator } from "react-native";
import React, { useState } from "react";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useUser } from "@/contexts/UserContext";

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

export default function GameButton() {
    const [isJoining, setIsJoining] = useState(false);
    const { user } = useUser();

    async function joinQueue() {
        if (!user) {
            console.error('User not found');
            return;
        }

        if (user.balance < 100) {
            console.error('Insufficient balance');
            return;
        }

        setIsJoining(true);

        try {
            const token = await AsyncStorage.getItem('auth_token');
            
            const response = await fetch(`${API_URL}/queue/join`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });

            const data = await response.json();

            if (response.ok && data.success) {
                // Navigate to lobby - lobby will handle the bot matching display
                router.push({
                    pathname: '/(game)/lobby',
                    params: {
                        gameId: data.game_id,
                        botId: data.bot.id,
                        botName: data.bot.name,
                        botPersonality: data.bot.personality_type,
                        userPlayerNumber: data.user_player_number,
                        roundId: data.round.id,
                    }
                });
            } else {
                console.error('Failed to join queue:', data.message);
            }
        } catch (error) {
            console.error('Failed to join queue:', error);
        } finally {
            setIsJoining(false);
        }
    }

    return (
        <Pressable
            onPress={joinQueue}
            style={({ pressed }) => [
                styles.button,
                pressed && styles.pressed,
            ]}
            accessibilityLabel="Join Game Queue"
            disabled={isJoining}
        >
            {isJoining ? (
                <ActivityIndicator size="large" color="black" />
            ) : (
                <Text style={styles.buttonText}>Play</Text>
            )}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    button: {
        margin: 20,
        width: 120,
        height: 120,
        borderWidth: 3,
        borderRadius: 75, 
        borderColor: 'white',
        justifyContent: 'center', 
        alignItems: 'center',    
        backgroundColor: '#ffe556ff',
        position: 'relative',
    },
    buttonText: {
        color: 'black',
        fontWeight: 'bold',
        fontSize: 24,
    },
    pressed: {
        top: 2,
    }
});