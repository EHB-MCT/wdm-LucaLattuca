import { Pressable, StyleSheet, Text, Alert, ActivityIndicator } from "react-native";
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
            Alert.alert('Error', 'User not found. Please log in again.');
            return;
        }

        // Check if user has sufficient balance
        if (user.balance < 100) {
            Alert.alert(
                'Insufficient Balance', 
                'You need at least $100 to play.'
            );
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
                // Navigate to lobby page with matched bot info
                router.push({
                    pathname: '/(game)/lobby',
                    params: {
                        botId: data.bot.id,
                        botName: data.bot.name,
                        gameId: data.game_id
                    }
                });
            } else {
                Alert.alert('Error', data.message || 'Failed to join queue');
            }
        } catch (error) {
            console.error('Failed to join queue:', error);
            
            // For testing: Navigate to lobby even if API fails
            Alert.alert(
                'Development Mode',
                'API not ready. Navigating to lobby for testing.',
                [
                    {
                        text: 'OK',
                        onPress: () => router.push('/(game)/lobby')
                    }
                ]
            );
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

// Sources
// Queue up logic added using Claude (Sonnet 4.5)
// https://claude.ai/share/4570ac86-c7f2-452d-93e4-b72281a330ba