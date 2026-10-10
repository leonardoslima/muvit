import '../../global.css';
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
  DMSans_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/dm-sans';
import { registerRootComponent } from 'expo';
import { Heart } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import {
  Badge,
  Button,
  Card,
  Field,
  Header,
  IconButton,
  Message,
  NumericField,
  SectionTab,
  SheetSurface,
  Skeleton,
  StatePanel,
  Surface,
  Text,
} from '../../src/components/ui/v2';
import { v2Colors } from '../../src/lib/design-system/tokens';

function FoundationPreview() {
  const [fontsLoaded] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
    DMSans_800ExtraBold,
  });
  const [page, setPage] = useState<'controls' | 'states'>('controls');
  const [count, setCount] = useState(0);
  const [name, setName] = useState('');
  const [number, setNumber] = useState('8');
  const act = () => setCount((current: number) => current + 1);
  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: v2Colors.background }}>
        {!fontsLoaded ? (
          <StatePanel kind="loading" title="Carregando fontes" />
        ) : (
          <ScrollView contentContainerClassName="gap-4 p-4" keyboardShouldPersistTaps="handled">
            <Header title="Foundation v2" />
            <Text accessibilityLiveRegion="polite">Ações executadas: {count}</Text>
            <View className="flex-row gap-2">
              <SectionTab
                label="Controles"
                selected={page === 'controls'}
                onPress={() => setPage('controls')}
                className="flex-1"
              />
              <SectionTab
                label="Estados"
                selected={page === 'states'}
                onPress={() => setPage('states')}
                className="flex-1"
              />
            </View>
            {page === 'controls' ? (
              <>
                <Button label="Validar ação" onPress={act} />
                <Button label="Ação secundária" variant="secondary" onPress={act} />
                <Button label="Ação desabilitada" disabled onPress={act} />
                <Button label="Processando" loading onPress={act} />
                <Field
                  testID="preview-name"
                  label="Nome de exemplo"
                  placeholder="Digite seu nome"
                  value={name}
                  onChangeText={setName}
                  hint="Texto de apoio acessível"
                />
                <Text>Valor digitado: {name || 'vazio'}</Text>
                <View className="w-[173px]">
                  <NumericField
                    label="Repetições"
                    value={number}
                    onChangeText={setNumber}
                    onIncrement={() => setNumber((current: string) => String(Number(current) + 1))}
                    onDecrement={() => setNumber((current: string) => String(Number(current) - 1))}
                  />
                </View>
                <Field label="Busca" kind="search" value="" onChangeText={() => undefined} />
                <Field
                  label="Senha"
                  kind="password"
                  value="segredo"
                  onChangeText={() => undefined}
                />
                <Field
                  label="Campo com erro"
                  value=""
                  onChangeText={() => undefined}
                  error="Revise o valor informado"
                />
                <Field
                  label="Campo desabilitado"
                  value="Indisponível"
                  disabled
                  onChangeText={() => undefined}
                />
                <IconButton
                  accessibilityLabel="Favoritar exemplo"
                  icon={<Heart color={v2Colors.brand} size={22} />}
                  onPress={act}
                />
                <Card action={{ label: 'Abrir exemplo', onPress: act }}>
                  <Text variant="sectionTitle">Card interativo</Text>
                  <Text>Conteúdo pode crescer com a escala de texto do sistema.</Text>
                </Card>
                <Button label="Remover exemplo" variant="destructive" onPress={act} />
                <Button label="Ação textual" variant="text" onPress={act} />
              </>
            ) : (
              <>
                <Header
                  title="Contexto do exemplo"
                  variant="contextual"
                  backAction={{ label: 'Voltar ao exemplo', onPress: act }}
                  action={{ label: 'Atualizar exemplo', onPress: act }}
                />
                <View className="flex-row flex-wrap gap-2">
                  <Badge label="Ativo" />
                  <Badge label="Inativo" variant="inactive" />
                  <Badge label="Pendente" variant="pending" />
                  <Badge label="Erro" variant="error" />
                </View>
                <Message
                  title="Informação acessível"
                  description="A mensagem combina ícone, texto e cor."
                />
                <Message variant="success" title="Alteração confirmada" />
                <Message variant="warning" title="Atenção ao exemplo" />
                <Message
                  variant="error"
                  title="Falha no exemplo"
                  action={{ label: 'Repetir mensagem', onPress: act }}
                />
                <StatePanel
                  kind="empty"
                  title="Nenhum item no exemplo"
                  description="Um estado vazio preserva contexto."
                  action={{ label: 'Criar exemplo', onPress: act }}
                />
                <StatePanel
                  kind="error"
                  title="Não foi possível carregar"
                  action={{ label: 'Tentar novamente', onPress: act }}
                />
                <StatePanel kind="success" title="Exemplo concluído" />
                <StatePanel kind="loading" title="Carregando exemplo" />
                <Surface variant="subtle" className="gap-3 p-4 rounded-v2-card">
                  <Text>Skeleton estático</Text>
                  <Skeleton />
                  <Skeleton className="w-1/2" />
                </Surface>
                <Surface variant="immersive" className="gap-4 rounded-v2-session p-4">
                  <Header
                    title="Sessão contextual"
                    variant="session"
                    backAction={{ label: 'Sair do exemplo', onPress: act }}
                  />
                  <Text variant="timer">01:30</Text>
                  <Button label="Continuar exemplo" variant="immersive" onPress={act} />
                  <Field
                    label="Carga"
                    value="20"
                    onChangeText={() => undefined}
                    unit="kg"
                    variant="immersive"
                  />
                  <Card variant="immersive">
                    <Text>Card da sessão</Text>
                  </Card>
                  <Skeleton variant="immersive" />
                </Surface>
                <Surface variant="raised" className="p-4">
                  <Text>Superfície elevada da sessão</Text>
                </Surface>
                <Card variant="highlight">
                  <Text variant="sectionTitle">Destaque contextual</Text>
                </Card>
                <SheetSurface>
                  <Text variant="sectionTitle">Superfície de confirmação</Text>
                  <Text>A navegação e o foco do modal pertencem ao consumidor.</Text>
                </SheetSurface>
              </>
            )}
            <Text variant="caption">Fim do catálogo de teste</Text>
          </ScrollView>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

registerRootComponent(FoundationPreview);
