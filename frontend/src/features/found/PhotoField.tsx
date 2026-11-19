import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { Pressable, Text, View } from 'react-native';
import { ErrorText, Icon, Note, styles } from '../../components/ui';
import { colors, fonts } from '../../theme';
import { MAX_PHOTO_BYTES, type Photo } from './model';

export default function PhotoField({ photo, onChange, error, onBusyChange }: { photo: Photo | null; onChange: (photo: Photo) => void; error?: string; onBusyChange: (busy: boolean) => void }) {
  const [uploadError, setUploadError] = useState('');
  async function pick() {
    setUploadError(''); onBusyChange(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], base64: true, quality: 1 });
      if (result.canceled) return;
      const asset = result.assets[0];
      const mimeType = asset.mimeType;
      if (!asset.base64 || !['image/jpeg', 'image/png'].includes(mimeType ?? '')) throw new Error('Choose a JPEG or PNG photo.');
      const size = asset.fileSize ?? Math.ceil(asset.base64.length * 0.75);
      if (size > MAX_PHOTO_BYTES) throw new Error('Choose a photo up to 10 MB.');
      onChange({ uri: `data:${mimeType};base64,${asset.base64}`, uploadUri: asset.uri, name: asset.fileName ?? 'Found item photo', mimeType: mimeType as Photo['mimeType'], size, width: asset.width, height: asset.height });
    } catch (failure) { setUploadError(failure instanceof Error ? failure.message : 'Could not open your photos. Try again.'); }
    finally { onBusyChange(false); }
  }
  return <View style={{ gap: 8 }}>
    <Text style={styles.label}>Photo (required)</Text>
    <Pressable role="button" accessibilityLabel={photo ? 'Replace photo' : 'Upload a photo'} onPress={pick} style={{ minHeight: 120, padding: 12, gap: 6, alignItems: 'center', justifyContent: 'center', borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.gold, backgroundColor: colors.muted }}>
      {photo ? <Image source={{ uri: photo.uri }} style={{ width: '100%', height: 120 }} contentFit="contain" accessibilityLabel="Selected found item" /> : <Icon name="camera" />}
      <Text style={{ fontFamily: fonts.semibold, fontSize: 15 }}>{photo ? 'Replace photo' : 'Upload a photo'}</Text>
    </Pressable>
    <Note>JPEG or PNG · up to 10 MB</Note>
    {(uploadError || error) && <ErrorText>{uploadError || error}</ErrorText>}
  </View>;
}
