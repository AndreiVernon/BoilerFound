import { useRef, useState, type ChangeEvent } from 'react';
import { Image } from 'expo-image';
import { Pressable, Text, View } from 'react-native';
import { ErrorText, Icon, Note, styles } from '../../components/ui';
import { colors, fonts } from '../../theme';
import { MAX_PHOTO_BYTES, type Photo } from './model';

export default function PhotoField({ photo, onChange, error, onBusyChange }: { photo: Photo | null; onChange: (photo: Photo) => void; error?: string; onBusyChange: (busy: boolean) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState('');
  const [busy, setBusy] = useState(false);
  async function select(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setUploadError(''); setBusy(true); onBusyChange(true);
    try {
      if (file.size > MAX_PHOTO_BYTES) throw new Error('Choose a photo up to 10 MB.');
      const bytes = new Uint8Array(await file.slice(0, 8).arrayBuffer());
      const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
      const png = [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value);
      if (!['image/jpeg', 'image/png'].includes(file.type) || (!jpeg && !png)) throw new Error('Choose a valid JPEG or PNG photo.');
      const uri = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('This photo could not be read. Try another.'));
        reader.readAsDataURL(file);
      });
      const decoded = new window.Image();
      decoded.src = uri;
      await decoded.decode();
      onChange({ uri, name: file.name, size: file.size, mimeType: png ? 'image/png' : 'image/jpeg', width: decoded.naturalWidth, height: decoded.naturalHeight });
    } catch (failure) {
      setUploadError(failure instanceof Error ? failure.message : 'This photo could not be read. Try another.');
    } finally { setBusy(false); onBusyChange(false); }
  }
  return <View style={{ gap: 8 }}>
    <Text style={styles.label}>Photo (required)</Text>
    <input ref={input} type="file" accept="image/jpeg,image/png" aria-label="Photo" aria-required="true" data-testid="photo-input" onChange={select} style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }} tabIndex={-1} />
    <Pressable role="button" accessibilityLabel={photo ? 'Replace photo' : 'Take or upload a photo'} disabled={busy} onPress={() => input.current?.click()}
      style={{ minHeight: 120, alignItems: 'center', justifyContent: 'center', borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed', borderColor: error || uploadError ? colors.error : colors.gold, backgroundColor: colors.muted, gap: 6, padding: 12 }}>
      {photo ? <Image source={{ uri: photo.uri }} style={{ width: '100%', height: 120 }} contentFit="contain" accessibilityLabel="Selected found item" /> : <Icon name="camera" />}
      <Text style={{ fontFamily: fonts.semibold, color: colors.black, fontSize: 15 }}>{busy ? 'Reading photo…' : photo ? 'Replace photo' : 'Take or upload a photo'}</Text>
      {!photo && <Note>Helps the owner recognize their item</Note>}
    </Pressable>
    <Note>{photo ? `${photo.name} · ` : ''}JPEG or PNG · up to 10 MB</Note>
    {photo && (photo.width < 640 || photo.height < 480) && <Note>This photo is small. A photo of at least 640 × 480 pixels may give better matches.</Note>}
    {(uploadError || error) && <ErrorText>{uploadError || error}</ErrorText>}
  </View>;
}
