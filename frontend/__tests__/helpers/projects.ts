import { Platform } from 'react-native';

/**
 * jest-expo/universal ejecuta cada suite en 4 proyectos con capacidades distintas.
 * Verificado empíricamente en este repo:
 * - android/ios: render + queries + eventos. Objetivo real de las pruebas UI.
 * - web: react-native-web + test renderer: las queries de texto no resuelven
 *   nodos y `fireEvent` toca el puente nativo (`__fbBatchedBridgeConfig`).
 * - node: ni siquiera las queries funcionan.
 * Conclusión: la UI se testea en nativo; web/node quedan para lógica pura.
 * La cobertura de jest fusiona los 4 proyectos, así que el código UI
 * queda cubierto por las pasadas nativas.
 */
export const isNative = Platform.OS === 'android' || Platform.OS === 'ios';

export const describeNative = isNative ? describe : describe.skip;
