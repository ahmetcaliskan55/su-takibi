import { act, create, type ReactTestInstance } from 'react-test-renderer';
import type { SettingsRepository } from '@/db/settingsRepository';
import { OnboardingFlow } from './OnboardingFlow';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

const texts = (root: ReactTestInstance) =>
  root.findAll((n) => (n.type as unknown) === 'Text').map((n) => n.children.filter((c): c is string => typeof c === 'string').join(''));
const btn = (root: ReactTestInstance, text: string) => root.findAll((n) => typeof n.props.onPress === 'function' && texts(n).includes(text))[0]!;

function setup(completeOnboarding: SettingsRepository['completeOnboarding'], requestPermission: () => Promise<unknown> = () => Promise.resolve(null)) {
  const onDone = jest.fn();
  const onRequestPermission = jest.fn(requestPermission);
  const repo = { completeOnboarding } as SettingsRepository;
  let r!: ReturnType<typeof create>;
  act(() => {
    r = create(<OnboardingFlow repo={repo} onDone={onDone} onRequestPermission={onRequestPermission} />);
  });
  return { root: r.root, onDone, onRequestPermission };
}
const toLastStep = (root: ReactTestInstance) => {
  for (let i = 0; i < 3; i++) act(() => btn(root, i === 0 ? 'Başlayalım' : 'Devam').props.onPress());
};

describe('OnboardingFlow', () => {
  it('"Bildirimlere izin ver": hatırlatmalar açık kaydedilir, izin istenir, kurulum biter', async () => {
    const complete = jest.fn().mockResolvedValue(undefined);
    const { root, onDone, onRequestPermission } = setup(complete);
    toLastStep(root);
    expect(texts(root).join(' ')).toContain('birazdan telefonun bildirim izni soracak');
    await act(async () => void btn(root, 'Bildirimlere izin ver').props.onPress());
    const arg = complete.mock.calls[0][0];
    expect(arg).toMatchObject({ goalMl: 2000, glassMl: 250, profile: { age: null, weightKg: null, activity: null } });
    expect(arg.reminders).toMatchObject({ remindersEnabled: true, intervalMin: 120, wakeMin: 480, sleepMin: 1380, tone: 'komik' });
    expect(onRequestPermission).toHaveBeenCalledTimes(1);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('"Şimdi değil": hatırlatmalar kapalı kaydedilir, izin istenmez, uygulama kullanılabilir', async () => {
    const complete = jest.fn().mockResolvedValue(undefined);
    const { root, onDone, onRequestPermission } = setup(complete);
    toLastStep(root);
    await act(async () => void btn(root, 'Şimdi değil').props.onPress());
    expect(complete.mock.calls[0][0].reminders.remindersEnabled).toBe(false);
    expect(onRequestPermission).not.toHaveBeenCalled();
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('izin reddedilse ya da hata verse de kurulum tamamlanır', async () => {
    const { root, onDone } = setup(jest.fn().mockResolvedValue(undefined), () => Promise.reject(new Error('reddedildi')));
    toLastStep(root);
    await act(async () => void btn(root, 'Bildirimlere izin ver').props.onPress());
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('kayıt başarısızsa ilk kurulum bitmiş sayılmaz, izin istenmez ve hata gösterilir', async () => {
    const { root, onDone, onRequestPermission } = setup(jest.fn().mockRejectedValue(new Error('disk')));
    toLastStep(root);
    await act(async () => void btn(root, 'Bildirimlere izin ver').props.onPress());
    expect(onDone).not.toHaveBeenCalled();
    expect(onRequestPermission).not.toHaveBeenCalled();
    expect(texts(root)).toContain('Kaydedilemedi. Biraz sonra tekrar dene.');
  });

  it('geri düğmesi önceki adıma döner', () => {
    const { root } = setup(jest.fn());
    act(() => btn(root, 'Başlayalım').props.onPress());
    expect(texts(root)).toContain('Seni tanıyalım');
    act(() => root.findByProps({ accessibilityLabel: 'Önceki adım' }).props.onPress());
    expect(texts(root)).toContain('Her güne bir tohum');
  });
});
