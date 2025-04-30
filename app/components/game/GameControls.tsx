import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface GameControlsProps {
  isMyTurn: boolean;
  playerScore: number;
  opponentScore: number;
  playerRemainingTime: number;
  opponentRemainingTime: number;
  remainingTime: number;
  letterPoolSize: number;
  onConfirmMove: () => void;
  onCancelMove: () => void;
  onPassMove?: () => void;
  onSurrenderGame?: () => void;
  onTimeUpdate?: (playerTime: number, opponentTime: number) => void;
}

const GameControls: React.FC<GameControlsProps> = ({
  isMyTurn,
  playerScore,
  opponentScore,
  playerRemainingTime,
  opponentRemainingTime,
  remainingTime,
  letterPoolSize,
  onConfirmMove,
  onCancelMove,
  onPassMove,
  onSurrenderGame,
  onTimeUpdate
}) => {
  const [displayTime, setDisplayTime] = useState(remainingTime);
  const [displayPlayerTime, setDisplayPlayerTime] = useState(playerRemainingTime);
  const [displayOpponentTime, setDisplayOpponentTime] = useState(opponentRemainingTime);
  
  // Son güncelleme zamanını izleyen ref
  const lastUpdateRef = useRef<number>(Date.now());
  
  // Süreleri props değiştiğinde güncelle
  useEffect(() => {
    setDisplayPlayerTime(playerRemainingTime);
  }, [playerRemainingTime]);
  
  useEffect(() => {
    setDisplayOpponentTime(opponentRemainingTime);
  }, [opponentRemainingTime]);
  
  useEffect(() => {
    setDisplayTime(remainingTime);
  }, [remainingTime]);
  
  // Aktif sıra zamanlayıcısı
  useEffect(() => {
    const timer = setInterval(() => {
      setDisplayTime(prevTime => {
        if (prevTime <= 0) return 0;
        return prevTime - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [remainingTime, isMyTurn]);
  
  // Oyuncu süresini güncelleyen useEffect
  useEffect(() => {
    if (isMyTurn) {
      const playerTimer = setInterval(() => {
        setDisplayPlayerTime(prevTime => {
          if (prevTime <= 0) return 0;
          const newTime = prevTime - 1;
          
          // Süre güncellendiğinde, üst bileşene bildir
          // Güncellemeleri sınırla: sadece belirli aralıklarla veya kritik sürelerde gönder
          const now = Date.now();
          if (onTimeUpdate && 
             (newTime % 5 === 0 || // Her 5 saniyede bir
              newTime <= 10 || // Son 10 saniye kritik
              now - lastUpdateRef.current >= 5000)) { // En az 5 saniye geçtiyse
            
            onTimeUpdate(newTime, displayOpponentTime);
            lastUpdateRef.current = now;
          }
          
          return newTime;
        });
      }, 1000);
      
      return () => clearInterval(playerTimer);
    }
  }, [isMyTurn, displayOpponentTime, onTimeUpdate]);
  
  // Rakip süresini güncelleyen useEffect
  useEffect(() => {
    if (!isMyTurn) {
      const opponentTimer = setInterval(() => {
        setDisplayOpponentTime(prevTime => {
          if (prevTime <= 0) return 0;
          const newTime = prevTime - 1;
          
          // Süre güncellendiğinde, üst bileşene bildir
          // Güncellemeleri sınırla: sadece belirli aralıklarla veya kritik sürelerde gönder
          const now = Date.now();
          if (onTimeUpdate && 
             (newTime % 5 === 0 || // Her 5 saniyede bir
              newTime <= 10 || // Son 10 saniye kritik
              now - lastUpdateRef.current >= 5000)) { // En az 5 saniye geçtiyse
            
            onTimeUpdate(displayPlayerTime, newTime);
            lastUpdateRef.current = now;
          }
          
          return newTime;
        });
      }, 1000);
      
      return () => clearInterval(opponentTimer);
    }
  }, [isMyTurn, displayPlayerTime, onTimeUpdate]);
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <>
      {/* Üst bilgi alanı */}
      <View style={styles.scoreBoard}>
        <View style={styles.scoreContainer}>
          <Text style={styles.scoreLabel}>Sizin Puanınız</Text>
          <Text style={styles.scoreValue}>{playerScore}</Text>
          <Text style={styles.timeLabel}>
            Kalan: {formatTime(displayPlayerTime)}
          </Text>
        </View>
        
        <View style={styles.timerContainer}>
          <Text style={styles.timerValue}>
            {formatTime(displayTime)}
          </Text>
          <Text style={styles.timerLabel}>
            {isMyTurn ? 'Sizin Turunuz' : 'Rakibin Turu'}
          </Text>
        </View>
        
        <View style={styles.scoreContainer}>
          <Text style={styles.scoreLabel}>Rakibin Puanı</Text>
          <Text style={styles.scoreValue}>{opponentScore}</Text>
          <Text style={styles.timeLabel}>
            Kalan: {formatTime(displayOpponentTime)}
          </Text>
        </View>
      </View>
      
      {/* Bilgi alanı ve Butonlar */}
      <View style={styles.gameActionsContainer}>
        {/* Oyun durumu bilgisi */}
        <View style={styles.gameStatusContainer}>
          <Text style={[styles.gameStatusText, isMyTurn ? styles.activeStatusText : styles.inactiveStatusText]}>
            {isMyTurn 
              ? '👉 SİZİN SIRA. Harflerinizden birini seçip tahtada bir kareye yerleştirin.' 
              : '⏳ RAKİBİN SIRASI. Hamle yapmasını bekleyin...'}
          </Text>
          <View style={styles.poolInfoContainer}>
            <Text style={styles.poolInfoText}>
              Havuzda kalan: <Text style={styles.poolCountText}>{letterPoolSize}</Text> harf
            </Text>
          </View>
        </View>
        
        {/* Oyun kontrol butonları */}
        {isMyTurn && (
          <>
            <View style={styles.buttonsContainer}>
              <TouchableOpacity 
                style={styles.cancelButton} 
                onPress={onCancelMove}
              >
                <Text style={styles.buttonText}>İPTAL ET</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.confirmButton} 
                onPress={onConfirmMove}
              >
                <Text style={styles.buttonText}>ONAYLA</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.additionalButtonsContainer}>
              {onPassMove && (
                <TouchableOpacity 
                  style={styles.passButton} 
                  onPress={onPassMove}
                >
                  <Text style={styles.additionalButtonText}>PAS GEÇ</Text>
                </TouchableOpacity>
              )}
              
              {onSurrenderGame && (
                <TouchableOpacity 
                  style={styles.surrenderButton} 
                  onPress={onSurrenderGame}
                >
                  <Text style={styles.additionalButtonText}>TESLİM OL</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  scoreBoard: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    paddingVertical: 10,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  scoreContainer: {
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 12,
    color: '#666',
  },
  scoreValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  timerContainer: {
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 15,
    backgroundColor: '#fff',
  },
  timerValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  timerLabel: {
    fontSize: 12,
    color: '#666',
  },
  timeLabel: {
    fontSize: 10,
    color: '#666',
    marginTop: 2,
  },
  gameActionsContainer: {
    width: '100%',
    marginBottom: 15,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  gameStatusContainer: {
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  gameStatusText: {
    fontSize: 15,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  activeStatusText: {
    color: '#28a745',
  },
  inactiveStatusText: {
    color: '#6c757d',
  },
  poolInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginTop: 5,
  },
  poolInfoText: {
    fontSize: 14,
    color: '#666',
  },
  poolCountText: {
    fontWeight: 'bold',
    color: '#007bff',
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  additionalButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#f9f9f9',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#dc3545',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 6,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#28a745',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 6,
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  passButton: {
    flex: 1,
    backgroundColor: '#6c757d',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 4,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  surrenderButton: {
    flex: 1,
    backgroundColor: '#dc3545',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 4,
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  additionalButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
});

export default GameControls; 