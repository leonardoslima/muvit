import { Ionicons } from '@expo/vector-icons';
import { useInfiniteQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  TRAINER_STUDENTS_PAGE_SIZE,
  listTrainerStudents,
} from '../application/trainer/trainer-data';
import { StudentListItem } from '../components/trainer/student-list-item';
import { InlineMessage } from '../components/ui/inline-message';
import { Screen, ScreenHeader } from '../components/ui/screen';
import { colors, controlSizes, fontFamilies, radii, spacing, typography } from '../lib/styles';
import { useApiClient } from '../lib/use-api';

export function TrainerStudentsScreen() {
  const api = useApiClient();
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const query = useInfiniteQuery({
    queryKey: ['trainer', 'students', appliedSearch],
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) =>
      listTrainerStudents(api, {
        q: appliedSearch,
        limit: TRAINER_STUDENTS_PAGE_SIZE,
        offset: pageParam,
        signal,
      }),
    getNextPageParam: (lastPage, pages) => {
      const loaded = pages.reduce((total, page) => total + page.items.length, 0);
      return loaded < lastPage.total ? loaded : undefined;
    },
  });

  const students = query.data?.pages.flatMap((page) => page.items) ?? [];
  const total = query.data?.pages[0]?.total ?? 0;
  const hasData = Boolean(query.data);
  const isInitialError = query.isError && !hasData;
  const isSearchEmpty = Boolean(appliedSearch) && hasData && total === 0;
  const isPortfolioEmpty = !appliedSearch && hasData && total === 0;
  const hasPaginationError = query.isFetchNextPageError;
  const hasRefreshError = query.isRefetchError && !hasPaginationError;

  function applySearch(): void {
    setAppliedSearch(searchInput.trim());
  }

  function clearSearch(): void {
    setSearchInput('');
    setAppliedSearch('');
  }

  function openStudent(studentId: string): void {
    router.push({
      pathname: '/trainer/students/[studentId]',
      params: { studentId },
    });
  }

  if (query.isPending) {
    return (
      <Screen scroll contentContainerStyle={styles.scrollContent}>
        <View style={styles.content} testID="trainer-students-content">
          <ScreenHeader
            eyebrow="ALUNOS"
            subtitle="Acompanhe a atividade recente de cada aluno."
            title="Alunos"
          />
          <StudentStatePanel
            description="Estamos carregando os alunos vinculados à sua conta."
            title="Carregando alunos"
            tone="loading"
          />
        </View>
      </Screen>
    );
  }

  if (isInitialError) {
    return (
      <Screen scroll contentContainerStyle={styles.scrollContent}>
        <View style={styles.content} testID="trainer-students-content">
          <ScreenHeader
            eyebrow="ALUNOS"
            subtitle="Acompanhe a atividade recente de cada aluno."
            title="Alunos"
          />
          <StudentStatePanel
            actionDisabled={query.isFetching}
            actionLabel="Tentar novamente"
            description="Verifique sua conexão e tente novamente."
            onAction={() => void query.refetch()}
            title="Não foi possível carregar seus alunos"
            tone="error"
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll contentContainerStyle={styles.scrollContent}>
      <View style={styles.content} testID="trainer-students-content">
        <ScreenHeader
          eyebrow="ALUNOS"
          subtitle="Acompanhe a atividade recente de cada aluno."
          title="Alunos"
        />
        <View style={styles.listContent}>
          <CompactAction
            disabled={query.isFetching}
            fullWidth
            label={query.isRefetching ? 'Atualizando...' : 'Atualizar'}
            onPress={() => void query.refetch()}
            size="compact"
            variant="secondary"
          />

          <View style={styles.searchRow}>
            <View style={styles.searchInputWrap}>
              <Ionicons color={colors.muted} name="search-outline" size={16} />
              <TextInput
                accessibilityLabel="Buscar aluno"
                autoCapitalize="words"
                onChangeText={setSearchInput}
                onSubmitEditing={applySearch}
                placeholder="Buscar aluno"
                placeholderTextColor={colors.muted}
                returnKeyType="search"
                style={styles.searchInput}
                value={searchInput}
              />
            </View>
            <CompactAction
              accessibilityLabel="Buscar"
              icon="search-outline"
              label="Buscar"
              onPress={applySearch}
            />
          </View>
          {searchInput || appliedSearch ? (
            <CompactAction label="Limpar busca" onPress={clearSearch} variant="secondary" />
          ) : null}

          {isSearchEmpty ? (
            <StudentStatePanel
              actionLabel="Limpar busca"
              description="Tente outro nome ou volte para a carteira completa."
              onAction={clearSearch}
              title="Nenhum aluno encontrado"
              tone="empty"
            />
          ) : null}

          {isPortfolioEmpty ? (
            <StudentStatePanel
              description="Nenhum aluno vinculado para acompanhar no momento."
              title="Nenhum aluno vinculado"
              tone="empty"
            />
          ) : null}

          <View style={styles.studentList} testID="trainer-students-list">
            {students.map((student) => (
              <StudentListItem
                key={student.id}
                onPress={() => openStudent(student.id)}
                student={student}
              />
            ))}
          </View>

          {hasRefreshError ? (
            <InlineMessage message="Não foi possível atualizar a lista." tone="error" />
          ) : null}
          {hasPaginationError ? (
            <>
              <InlineMessage message="Não foi possível carregar mais alunos." tone="error" />
              <CompactAction
                disabled={query.isFetching}
                label={query.isFetchingNextPage ? 'Carregando mais...' : 'Tentar carregar mais'}
                onPress={() => void query.fetchNextPage()}
                variant="secondary"
              />
            </>
          ) : null}

          {query.hasNextPage && !hasPaginationError ? (
            <CompactAction
              disabled={query.isFetching}
              label={query.isFetchingNextPage ? 'Carregando mais...' : 'Carregar mais'}
              onPress={() => void query.fetchNextPage()}
              variant="secondary"
            />
          ) : null}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    gap: 0,
    padding: 0,
  },
  content: {
    gap: spacing.xxl,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },
  listContent: {
    gap: spacing.md,
  },
  searchRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  searchInputWrap: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.control,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    height: controlSizes.input,
    paddingHorizontal: spacing.md,
  },
  searchInput: {
    ...typography.input,
    color: colors.ink,
    flex: 1,
    height: controlSizes.input,
    padding: 0,
  },
  studentList: {
    gap: 10,
  },
  action: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radii.control,
    flexDirection: 'row',
    gap: spacing.sm,
    height: controlSizes.button,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  actionSecondary: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderWidth: 1,
  },
  actionCompact: {
    height: 40,
  },
  actionState: {
    height: 36,
  },
  actionFullWidth: {
    alignSelf: 'stretch',
  },
  actionText: {
    color: colors.ink,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: 13,
  },
  actionTextCompact: {
    fontSize: 14,
  },
  actionTextState: {
    fontSize: 13,
  },
  actionDisabled: {
    opacity: 0.5,
  },
  statePanel: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.control,
    borderWidth: 1,
    gap: 6,
    padding: 14,
  },
  statePanelCompact: {
    minHeight: 117,
  },
  statePanelError: {
    minHeight: 152,
  },
  stateIcon: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.avatar,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  stateIconLoading: {
    backgroundColor: '#EBF5FB',
  },
  stateIconError: {
    backgroundColor: colors.dangerSoft,
  },
  stateTitle: {
    color: colors.ink,
    fontFamily: fontFamilies.heading,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  stateDescription: {
    color: colors.muted,
    fontFamily: fontFamilies.body,
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
  },
  stateAction: {
    alignSelf: 'stretch',
  },
});

type CompactActionProps = {
  accessibilityLabel?: string;
  disabled?: boolean;
  fullWidth?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  size?: 'compact' | 'default' | 'state';
  variant?: 'primary' | 'secondary';
};

function CompactAction({
  accessibilityLabel,
  disabled = false,
  fullWidth = false,
  icon,
  label,
  onPress,
  size = 'default',
  variant = 'primary',
}: CompactActionProps) {
  return (
    <Pressable
      accessible
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={size === 'state' ? 8 : 6}
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.action,
        variant === 'secondary' ? styles.actionSecondary : null,
        size === 'compact' ? styles.actionCompact : null,
        size === 'state' ? styles.actionState : null,
        fullWidth ? styles.actionFullWidth : null,
        disabled ? styles.actionDisabled : null,
        pressed && !disabled ? styles.actionDisabled : null,
      ]}
    >
      <Text
        style={[
          styles.actionText,
          size === 'compact' ? styles.actionTextCompact : null,
          size === 'state' ? styles.actionTextState : null,
        ]}
      >
        {label}
      </Text>
      {icon ? <Ionicons color={colors.ink} name={icon} size={16} /> : null}
    </Pressable>
  );
}

type StudentStatePanelProps = {
  actionDisabled?: boolean;
  actionLabel?: string;
  description: string;
  onAction?: () => void;
  title: string;
  tone: 'loading' | 'empty' | 'error';
};

function StudentStatePanel({
  actionDisabled = false,
  actionLabel,
  description,
  onAction,
  title,
  tone,
}: StudentStatePanelProps) {
  const icon = tone === 'error' ? 'warning-outline' : 'people-outline';
  const iconColor =
    tone === 'loading' ? '#3498DB' : tone === 'error' ? colors.danger : colors.muted;

  return (
    <View
      style={[
        styles.statePanel,
        tone === 'error' ? styles.statePanelError : styles.statePanelCompact,
      ]}
      testID="trainer-students-state-panel"
    >
      <View
        style={[
          styles.stateIcon,
          tone === 'loading' ? styles.stateIconLoading : null,
          tone === 'error' ? styles.stateIconError : null,
        ]}
        testID="trainer-students-state-icon"
      >
        {tone === 'loading' ? (
          <ActivityIndicator accessibilityLabel="Carregando" color={iconColor} size="small" />
        ) : (
          <Ionicons color={iconColor} name={icon} size={18} />
        )}
      </View>
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateDescription}>{description}</Text>
      {actionLabel && onAction ? (
        <View style={styles.stateAction}>
          <CompactAction
            disabled={actionDisabled}
            fullWidth
            icon={tone === 'error' ? 'refresh-outline' : undefined}
            label={actionLabel}
            onPress={onAction}
            size="state"
          />
        </View>
      ) : null}
    </View>
  );
}
