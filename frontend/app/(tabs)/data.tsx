import React from 'react';
import { View } from 'react-native';
import { RadarChart } from 'react-native-gifted-charts';



export default function DataScreen(){
    const data = [1,2,4,5,5];


    return(

        
            <View style={{ width: 300, height: 300 }}>
                <RadarChart data={data} />
            </View>
        
    
    )


}