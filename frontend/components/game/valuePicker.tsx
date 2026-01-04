import React, { useState, useEffect } from 'react';
import { StyleSheet, Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker';

interface ValuePickerProps {
  minValue?: number;
  maxValue?: number;
  increment?: number;
  initialValue?: number;
  onValueSettled?: (value: number) => void;
}

export default function ValuePicker({
  minValue = 100, 
  maxValue = 5000, 
  increment = 10,
  initialValue = 100,
  onValueSettled
}: ValuePickerProps) {
    
  const [selectedValue, setSelectedValue] = useState<number>(initialValue);

  // Update when initialValue changes (for round resets)
  useEffect(() => {
    setSelectedValue(initialValue);
  }, [initialValue]);

  const values = [];
  for (let i = minValue; i <= maxValue; i += increment) {
    values.push(i);
  }

  const handleValueChange = (itemValue: number) => {
    setSelectedValue(itemValue);
    console.log('Selected value:', itemValue);
    // Call the callback immediately when value changes
    if (onValueSettled) {
      onValueSettled(itemValue);
    }
  };

  return (
      <Picker
        selectedValue={selectedValue}
        onValueChange={handleValueChange}
        style={styles.picker}
        itemStyle={styles.pickerItem} // iOS specific
      >
        {values.map((value) => (
          <Picker.Item 
            key={value} 
            label={value.toString()} 
            value={value}
            color="black" // Android specific
          />
        ))}
      </Picker>
  );
}

const styles = StyleSheet.create({  
    picker: {
        height: 40,
        width: 200,
    },
    pickerItem: {
        // iOS specific styling
        fontSize: 18,
        fontWeight: 'bold',
        color: 'black',
        height: 40,

    }
});
// sources
// value picker generated using Claude (Sonnet 4.5)
// https://claude.ai/share/d8756bf7-840c-4f29-8fc0-632b20d692ef