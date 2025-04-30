import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface LogoTileProps {
  letter: string;
  size: number;
}

export const LogoTile = ({ letter, size }: LogoTileProps) => {
  const fontSize = size * 0.6;
  
  return (
    <View style={[
      styles.container, 
      { 
        width: size, 
        height: size,
        borderRadius: size * 0.12,
      }
    ]}>
      <LinearGradient
        colors={['#f9f5e8', '#e8e1cc']}
        style={[
          styles.tile,
          { 
            width: size, 
            height: size,
            borderRadius: size * 0.12,
          }
        ]}
      >
        <Text 
          style={[
            styles.letter, 
            { 
              fontSize,
              textShadowRadius: 1,
              textShadowOffset: { width: 0, height: 1 },
              textShadowColor: 'rgba(255,255,255,0.5)'
            }
          ]}
        >
          {letter}
        </Text>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 5,
    elevation: 5,
  },
  tile: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0d8c0',
  },
  letter: {
    fontWeight: '800',
    color: '#5d4524',
  },
}); 