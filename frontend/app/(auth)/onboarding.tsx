// app/(auth)/onboarding.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

// Generate age options from 13 to 120
const generateAgeOptions = () => {
  const ages = [];
  for (let i = 13; i <= 120; i++) {
    ages.push({ label: `${i} years old`, value: i.toString() });
  }
  return ages;
};

const GENDER_OPTIONS = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
  { label: 'Non-binary', value: 'non-binary' },
  { label: 'Other', value: 'other' },
  { label: 'Prefer not to say', value: 'prefer-not-to-say' },
];

const NATIONALITY_OPTIONS = [
  { label: 'United States', value: 'United States' },
  { label: 'United Kingdom', value: 'United Kingdom' },
  { label: 'Canada', value: 'Canada' },
  { label: 'Australia', value: 'Australia' },
  { label: 'Germany', value: 'Germany' },
  { label: 'France', value: 'France' },
  { label: 'Spain', value: 'Spain' },
  { label: 'Italy', value: 'Italy' },
  { label: 'Netherlands', value: 'Netherlands' },
  { label: 'Belgium', value: 'Belgium' },
  { label: 'Switzerland', value: 'Switzerland' },
  { label: 'Austria', value: 'Austria' },
  { label: 'Poland', value: 'Poland' },
  { label: 'Sweden', value: 'Sweden' },
  { label: 'Norway', value: 'Norway' },
  { label: 'Denmark', value: 'Denmark' },
  { label: 'Finland', value: 'Finland' },
  { label: 'Ireland', value: 'Ireland' },
  { label: 'Portugal', value: 'Portugal' },
  { label: 'Greece', value: 'Greece' },
  { label: 'Japan', value: 'Japan' },
  { label: 'South Korea', value: 'South Korea' },
  { label: 'China', value: 'China' },
  { label: 'India', value: 'India' },
  { label: 'Brazil', value: 'Brazil' },
  { label: 'Mexico', value: 'Mexico' },
  { label: 'Argentina', value: 'Argentina' },
  { label: 'South Africa', value: 'South Africa' },
  { label: 'Other', value: 'Other' },
];

export default function OnboardingScreen() {
  const [username, setUsername] = useState('');
  const [age, setAge] = useState('');
  const [ageLabel, setAgeLabel] = useState('');
  const [gender, setGender] = useState('');
  const [genderLabel, setGenderLabel] = useState('');
  const [nationality, setNationality] = useState('');
  const [nationalityLabel, setNationalityLabel] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({ age: '', gender: '', nationality: '' });
  
  // Modal states
  const [showAgePicker, setShowAgePicker] = useState(false);
  const [showGenderPicker, setShowGenderPicker] = useState(false);
  const [showNationalityPicker, setShowNationalityPicker] = useState(false);

  const ageOptions = generateAgeOptions();

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const userString = await AsyncStorage.getItem('user');
      if (userString) {
        const user = JSON.parse(userString);
        setUsername(user.username || 'User');
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const validateForm = () => {
    let valid = true;
    const newErrors = { age: '', gender: '', nationality: '' };

    if (!age) {
      newErrors.age = 'Please select your age';
      valid = false;
    }

    if (!gender) {
      newErrors.gender = 'Please select your gender';
      valid = false;
    }

    if (!nationality) {
      newErrors.nationality = 'Please select your nationality';
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  const handleCompleteOnboarding = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setErrors({ age: '', gender: '', nationality: '' });

    try {
      const token = await AsyncStorage.getItem('auth_token');

      if (!token) {
        Alert.alert('Error', 'Authentication token not found. Please login again.');
        router.replace('/(auth)/login');
        return;
      }

      console.log('Completing onboarding with:', { age: parseInt(age), gender, nationality });

      const response = await fetch(`${API_URL}/onboarding`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          age: parseInt(age),
          gender: gender,
          nationality: nationality,
        }),
      });

      const data = await response.json();
      console.log('Response data:', data);

      if (!response.ok) {
        if (data.errors) {
          setErrors({
            age: data.errors.age ? data.errors.age[0] : '',
            gender: data.errors.gender ? data.errors.gender[0] : '',
            nationality: data.errors.nationality ? data.errors.nationality[0] : '',
          });
        } else {
          Alert.alert('Error', data.message || 'Onboarding failed');
        }
        return;
      }

      // Update stored user data
      await AsyncStorage.setItem('user', JSON.stringify(data.user));

      // Navigate to home screen
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Onboarding error:', error);
      Alert.alert('Error', 'Failed to complete onboarding. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderPickerModal = (
    visible: boolean,
    onClose: () => void,
    options: { label: string; value: string }[],
    onSelect: (item: { label: string; value: string }) => void,
    title: string
  ) => (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.modalClose}>Done</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={options}
            keyExtractor={(item) => item.value}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.modalItem}
                onPress={() => {
                  onSelect(item);
                  onClose();
                }}
              >
                <Text style={styles.modalItemText}>{item.label}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Hello {username}! 👋</Text>
        <Text style={styles.subtitle}>Let's get to know you better</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Age</Text>
          <TouchableOpacity
            style={[styles.selectButton, errors.age ? styles.selectButtonError : null]}
            onPress={() => setShowAgePicker(true)}
            disabled={loading}
          >
            <Text style={[styles.selectButtonText, !ageLabel && styles.placeholderText]}>
              {ageLabel || 'Select your age'}
            </Text>
          </TouchableOpacity>
          {errors.age ? <Text style={styles.errorText}>{errors.age}</Text> : null}
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Gender</Text>
          <TouchableOpacity
            style={[styles.selectButton, errors.gender ? styles.selectButtonError : null]}
            onPress={() => setShowGenderPicker(true)}
            disabled={loading}
          >
            <Text style={[styles.selectButtonText, !genderLabel && styles.placeholderText]}>
              {genderLabel || 'Select your gender'}
            </Text>
          </TouchableOpacity>
          {errors.gender ? <Text style={styles.errorText}>{errors.gender}</Text> : null}
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Nationality</Text>
          <TouchableOpacity
            style={[styles.selectButton, errors.nationality ? styles.selectButtonError : null]}
            onPress={() => setShowNationalityPicker(true)}
            disabled={loading}
          >
            <Text style={[styles.selectButtonText, !nationalityLabel && styles.placeholderText]}>
              {nationalityLabel || 'Select your nationality'}
            </Text>
          </TouchableOpacity>
          {errors.nationality ? (
            <Text style={styles.errorText}>{errors.nationality}</Text>
          ) : null}
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleCompleteOnboarding}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Complete Setup</Text>
          )}
        </TouchableOpacity>
      </View>

      {renderPickerModal(
        showAgePicker,
        () => setShowAgePicker(false),
        ageOptions,
        (item) => {
          setAge(item.value);
          setAgeLabel(item.label);
          if (errors.age) setErrors({ ...errors, age: '' });
        },
        'Select Age'
      )}

      {renderPickerModal(
        showGenderPicker,
        () => setShowGenderPicker(false),
        GENDER_OPTIONS,
        (item) => {
          setGender(item.value);
          setGenderLabel(item.label);
          if (errors.gender) setErrors({ ...errors, gender: '' });
        },
        'Select Gender'
      )}

      {renderPickerModal(
        showNationalityPicker,
        () => setShowNationalityPicker(false),
        NATIONALITY_OPTIONS,
        (item) => {
          setNationality(item.value);
          setNationalityLabel(item.label);
          if (errors.nationality) setErrors({ ...errors, nationality: '' });
        },
        'Select Nationality'
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 24,
    paddingTop: 60,
  },
  header: {
    marginBottom: 40,
  },
  greeting: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  selectButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 16,
    backgroundColor: '#f9f9f9',
  },
  selectButtonError: {
    borderColor: '#ff3b30',
  },
  selectButtonText: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  placeholderText: {
    color: '#999',
  },
  errorText: {
    color: '#ff3b30',
    fontSize: 12,
    marginTop: 4,
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  modalClose: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  modalItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalItemText: {
    fontSize: 16,
    color: '#1a1a1a',
  },
});