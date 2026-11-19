import { useRef, useState } from 'react';
import { router } from 'expo-router';
import Head from 'expo-router/head';
import { View } from 'react-native';
import { BackButton, Button, ErrorText, Field, Heading, Note, Screen, styles } from '../../components/ui';
import { useFoundDraft } from '../../features/found/DraftProvider';
import { type FormErrors, type FoundDraft, validateReport } from '../../features/found/model';
import PhotoField from '../../features/found/PhotoField';
import { reportRepository } from '../../features/found/reportRepository';

export default function ReportScreen() {
  const { draft, update, reset } = useFoundDraft();
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const submittingRef = useRef(false);
  function change(patch: Partial<FoundDraft>) {
    update(patch);
    setErrors(current => {
      const next = { ...current };
      for (const key of Object.keys(patch) as (keyof FoundDraft)[]) delete next[key];
      return next;
    });
    setSubmitError('');
  }
  async function submit() {
    if (submittingRef.current || photoBusy) return;
    const nextErrors = validateReport(draft);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    submittingRef.current = true; setSubmitting(true); setSubmitError('');
    try {
      const saved = await reportRepository.save(draft);
      reset();
      router.replace({ pathname: '/found/thank-you', params: { id: saved.id } });
    } catch (failure) {
      const message = failure instanceof Error ? failure.message : 'Your report could not be saved.';
      setSubmitError(`${message} Your entries are still here.`);
    } finally { submittingRef.current = false; setSubmitting(false); }
  }
  return <Screen>
    <Head><title>Report a found item | BoilerFound</title></Head>
    <BackButton to="/found" />
    <Heading>Report a found item</Heading>
    <Note>Photo and found location are required.</Note>
    {Object.keys(errors).length > 0 && <ErrorText>Please complete the required fields below.</ErrorText>}
    <PhotoField photo={draft.photo} onChange={photo => change({ photo })} error={errors.photo} onBusyChange={setPhotoBusy} />
    <Field label="Where did you find it?" required placeholder="e.g. Lawson, room 1142" value={draft.location} onChangeText={location => change({ location })} maxLength={150} error={errors.location} />
    <Field label="Where are you leaving it?" placeholder="e.g. Lawson front desk" value={draft.dropOff} onChangeText={dropOff => change({ dropOff })} maxLength={150} error={errors.dropOff} hint="If known, give the building and desk where you will drop it off." />
    <Field label="Description" placeholder="Color, brand, unique details…" value={draft.description} onChangeText={description => change({ description })} maxLength={1000} multiline error={errors.description} hint={`${draft.description.length} / 1000 characters`} />
    <Field label="Question only the owner can answer" placeholder="e.g. What’s written on the inside tag?" value={draft.question} onChangeText={question => change({ question })} maxLength={300} error={errors.question} hint="Optional. Without a question, desk staff still verify ownership at pickup." />
    <View style={styles.spacer} />
    {!!submitError && <ErrorText>{submitError}</ErrorText>}
    <Button title={submitting ? 'Saving report…' : 'Submit report'} disabled={submitting || photoBusy} onPress={submit} />
  </Screen>;
}
