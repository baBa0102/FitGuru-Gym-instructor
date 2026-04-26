import { Redirect } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';

export default function IndexScreen() {
  const { user, profile, loading } = useAuth();
  const [targetRoute, setTargetRoute] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setTargetRoute('/login');
      return;
    }
    setTargetRoute(profile ? '/(tabs)' : '/onboarding');
  }, [loading, user, profile]);

  if (loading || !targetRoute) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#3dbf3d" />
      </View>
    );
  }

  return <Redirect href={targetRoute as '/login' | '/onboarding' | '/(tabs)'} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
