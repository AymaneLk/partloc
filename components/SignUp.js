import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, Alert, Dimensions, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme';
import { supabase } from '../supabaseClient';
import DropDownPicker from 'react-native-dropdown-picker';

const { width, height } = Dimensions.get('window');

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const SignUp = () => {
  const navigation = useNavigation();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [year, setYear] = useState('');
  const [loading, setLoading] = useState(false);

  const [monthOpen, setMonthOpen] = useState(false);
  const [monthValue, setMonthValue] = useState(1); // Set to 1 for January
  const [monthItems, setMonthItems] = useState(months.map((m, index) => ({ label: m, value: index + 1 })));

  const [dayOpen, setDayOpen] = useState(false);
  const [dayValue, setDayValue] = useState(null);
  const [dayItems, setDayItems] = useState([]);

  const currentYear = new Date().getFullYear();

  useEffect(() => {
    updateDays();
  }, [monthValue]);

  useEffect(() => {
    // Initialize days for January when component mounts
    updateDays();
  }, []);

  const updateDays = () => {
    const selectedMonth = monthValue || 1; // Use 1 (January) if monthValue is null
    const daysInMonth = new Date(currentYear, selectedMonth, 0).getDate();
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    setDayItems(days.map(d => ({ label: d.toString(), value: d })));
  };

  const handleSignUp = async () => {
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (!fullName || !email || !password || !dayValue || !monthValue || !year) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const birthYear = parseInt(year);
    if (birthYear < 1900 || birthYear > currentYear) {
      Alert.alert('Error', 'Please enter a valid year between 1900 and ' + currentYear);
      return;
    }

    setLoading(true);
    try {
      // Sign up the user
      const { data, error } = await supabase.auth.signUp({ 
        email, 
        password,
      });

      if (error) throw error;

      // If sign up is successful, create a profile
      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            user_id: data.user.id,
            full_name: fullName,
            email: email,
            date_of_birth: `${year}-${String(monthValue).padStart(2, '0')}-${String(dayValue).padStart(2, '0')}`,
            show_emergency_contacts: false
          });

        if (profileError) throw profileError;
      }

      Alert.alert('Success', 'Account created successfully. Please check your email for verification.', [
        { text: 'OK', onPress: () => navigation.navigate('Login') }
      ]);
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingView}
      >
        <View style={styles.content}>
          <Text style={styles.welcomeText}>Create Account</Text>
          <Text style={styles.subtitle}>Sign up to join locateIt</Text>
          
          <TextInput
            style={styles.input}
            placeholder="Full Name"
            placeholderTextColor={colors.secondary}
            value={fullName}
            onChangeText={setFullName}
          />
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={colors.secondary}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={colors.secondary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <TextInput
            style={styles.input}
            placeholder="Confirm Password"
            placeholderTextColor={colors.secondary}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />
          <View style={styles.dateInputContainer}>
            <View style={[styles.dateInput, styles.pickerContainer]}>
              <DropDownPicker
                open={dayOpen}
                value={dayValue}
                items={dayItems}
                setOpen={setDayOpen}
                setValue={setDayValue}
                setItems={setDayItems}
                placeholder="Day"
                style={styles.dropDownPicker}
                dropDownContainerStyle={styles.dropDownContainer}
                zIndex={3000}
                zIndexInverse={1000}
              />
            </View>
            <View style={[styles.dateInput, styles.pickerContainer]}>
              <DropDownPicker
                open={monthOpen}
                value={monthValue}
                items={monthItems}
                setOpen={setMonthOpen}
                setValue={setMonthValue}
                setItems={setMonthItems}
                placeholder="Month"
                style={styles.dropDownPicker}
                dropDownContainerStyle={styles.dropDownContainer}
                zIndex={2000}
                zIndexInverse={2000}
              />
            </View>
            <TextInput
              style={[styles.input, styles.dateInput]}
              placeholder="Year"
              placeholderTextColor={colors.secondary}
              value={year}
              onChangeText={setYear}
              keyboardType="number-pad"
              maxLength={4}
            />
          </View>
          <TouchableOpacity style={styles.signUpButton} onPress={handleSignUp} disabled={loading}>
            <Text style={styles.signUpButtonText}>{loading ? 'Loading...' : 'Sign Up'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.loginText}>Already have an account? Log In</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  welcomeText: {
    fontFamily: 'ClashGrotesk-Bold',
    fontSize: 32,
    color: colors.error,
    marginBottom: 10,
  },
  subtitle: {
    fontFamily: 'ClashGrotesk-Medium',
    fontSize: 16,
    color: colors.secondary,
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    height: 50,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 20,
    marginBottom: 15,
    fontSize: 16,
    fontFamily: 'ClashGrotesk-Regular',
    color: colors.text.primary,
  },
  dateInputContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 15,
    zIndex: 3000,
  },
  dateInput: {
    width: '30%',
  },
  pickerContainer: {
    height: 50,
    justifyContent: 'center',
  },
  dropDownPicker: {
    backgroundColor: colors.surface,
    borderColor: colors.error,
    height: 50,
  },
  dropDownContainer: {
    backgroundColor: colors.surface,
    borderColor: colors.error,
  },
  signUpButton: {
    width: '100%',
    height: 50,
    backgroundColor: colors.error,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    zIndex: 1,
  },
  signUpButtonText: {
    color: colors.white,
    fontSize: 16,
    fontFamily: 'ClashGrotesk-Semibold',
  },
  loginText: {
    fontFamily: 'ClashGrotesk-Medium',
    fontSize: 14,
    color: colors.error,
    marginTop: 20,
  },
});

export default SignUp;