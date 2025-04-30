import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { LETTER_POINTS, TILE_SIZE } from '../../utils/gameConstants';

// Ekran genişliğini al
const { width } = Dimensions.get('window');

// Daha büyük raf için kare boyutunu hesapla
const RACK_TILE_SIZE = Math.min(TILE_SIZE * 1.7, 60);

interface RackProps {
  playerRack: string[];
  isMyTurn: boolean;
  onRackTilePress: (index: number) => void;
  selectedRackTile: number | null;
}

const Rack: React.FC<RackProps> = ({ 
  playerRack, 
  isMyTurn, 
  onRackTilePress, 
  selectedRackTile 
}) => {
  return (
    <View style={styles.rackContainer}>
      <View style={styles.rackTilesContainer}>
        {playerRack.map((letter, index) => (
          <TouchableOpacity
            key={`rack-${index}`}
            style={[
              styles.rackTile,
              !letter && styles.emptyRackTile,
              selectedRackTile === index && styles.selectedRackTile
            ]}
            onPress={() => onRackTilePress(index)}
            disabled={!letter || !isMyTurn}
          >
            {letter ? (
              <View style={styles.letterContainer}>
                <Text style={styles.letterText}>{letter}</Text>
                <Text style={styles.pointText}>
                  {letter !== '*' ? LETTER_POINTS[letter] : 0}
                </Text>
              </View>
            ) : null}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  rackContainer: {
    width: width - 20, // Ekranın genişliğini kapla (sadece 10px kenar boşluğu bırak)
    marginVertical: 15,
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  rackTilesContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
  },
  rackTile: {
    width: RACK_TILE_SIZE,
    height: RACK_TILE_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffefd5', // Light beige color
    borderWidth: 1,
    borderColor: '#d2b48c',
    borderRadius: 8,
    margin: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  emptyRackTile: {
    backgroundColor: '#f5f5f5',
    borderColor: '#ddd',
  },
  selectedRackTile: {
    borderColor: '#007bff',
    borderWidth: 2,
    backgroundColor: '#e6f7ff',
  },
  letterContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  letterText: {
    fontSize: RACK_TILE_SIZE * 0.55,
    fontWeight: 'bold',
    color: '#333',
  },
  pointText: {
    fontSize: RACK_TILE_SIZE * 0.25,
    color: '#666',
    position: 'absolute',
    bottom: 4,
    right: 4,
  },
});

export default Rack; 