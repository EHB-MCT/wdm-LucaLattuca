import { View, Text, StyleSheet } from "react-native";

type StatProps = {
    user: {
        username: string;
        email: string;
        balance: string | number;
        age: number;
        gender: string;
        nationality: string;
        trust_score: number;

        openness?: number;
        conscientiousness?: number;
        extraversion?: number;
        agreeableness?: number;
        neuroticism?: number;
    }
}

export default function Stats({user}: StatProps)  {
 

    return (
        <View style={styles.stats}>
               <View style={styles.info}>

                     <Text style={styles.header}>Info</Text>
                     <View>

                        <View style={styles.row}>
                            <Text style={styles.label}>Username</Text>
                            <Text style={styles.value}>{user.username}</Text>
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.label}>Age</Text>
                            <Text style={styles.value}>{user.age}</Text>
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.label}>Gender</Text>
                            <Text style={styles.value}>{user.gender}</Text>
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.label}>Nationality</Text>
                            <Text style={styles.value}>{user.nationality}</Text>
                        </View>
                        
                     </View>

                     <Text style={styles.header}>Trust Profile</Text>

                     <View>
                        <View style={[styles.row, styles.trustScore]}>
                            <Text style={styles.label}>Trust Score</Text>
                            <Text style={styles.value}>{user.trust_score}</Text>
                        </View>

                        
                        <View>

                            <View style={styles.row}>
                                <Text style={styles.label}>Openness</Text>
                                <Text style={styles.value}>{user.openness}</Text>
                            </View>
                            <View style={styles.row}>
                                <Text style={styles.label}>Conscientiousness</Text>
                                <Text style={styles.value}>{user.conscientiousness}</Text>  
                            </View>
                            <View style={styles.row}>
                                <Text style={styles.label}>Extraversion</Text>
                                <Text style={styles.value}>{user.extraversion}</Text>   
                            </View>
                            <View style={styles.row}>
                                <Text style={styles.label}>Agreeableness</Text>
                                <Text style={styles.value}>{user.agreeableness}</Text>
                            </View>
                            <View style={styles.row}>
                                <Text style={styles.label}>Neuroticism</Text>
                                <Text style={styles.value}>{user.neuroticism}</Text>  
                            </View>


                        </View>

                     </View>
               </View>
               <View style={styles.graphs}>
                    <View style={styles.trustScoreGraph}>

                    </View>
                    <View style={styles.oceanGraph}>

                    </View>
                    
               </View>
        </View>    
    )
}
const styles = StyleSheet.create({
    header:{
        fontSize: 24,
        fontWeight: "bold",
        color: "black",
        marginBottom: 10,
    },
    stats:{
        
        backgroundColor: 'white',
        width: '90%',
        padding: 10,
        marginBottom: 20,
        borderRadius: 10,
        display: 'flex',
        flexDirection: 'row',
    },
    info:{
        width: '50%',
        flexDirection: 'column',
        
    },
    
    row:{
        flexDirection: 'row',
        marginBottom: 5,
    },
    label:{
        width: '90%',
    },
    value:{

    },
    graphs:{
        width: '50%',
        
        justifyContent: 'flex-end',
    },
    trustScore:{
        marginBottom: 15,
    },
    trustScoreGraph:{
        borderWidth: 1,
        height: 30,
        marginBottom: 5,
    },
    oceanGraph:{
        alignSelf: 'center',
        borderWidth: 1,
        height: 110,
        width:  110,
    },
})

// Sources:
// flexbox layout: https://chatgpt.com/share/694dd95c-a0d4-800a-9929-3b29abd0ace3
