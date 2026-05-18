import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  CreditCard,
  Dumbbell,
  Heart,
  Menu,
  MessageCircle,
  Play,
  Smartphone,
  Sparkles,
  Star,
  Users,
  X,
} from 'lucide-react';
import Link from 'next/link';

const NAV_LINKS: Array<[label: string, href: string]> = [
  ['Funcionalidades', '#features'],
  ['Preços', '#pricing'],
  ['Para trainers', '#audiences'],
  ['Para alunos', '#audiences'],
];

const TRUST_ITEMS = [
  { icon: BadgeCheck, label: 'Gratuito para começar' },
  { icon: Smartphone, label: 'App nativo iOS e Android' },
  { icon: CreditCard, label: 'Sem cartão de crédito' },
];

const PROBLEM_CARDS = [
  {
    title: 'Retrabalho toda semana',
    body: 'Reescrever fichas em planilhas, copiar e colar treinos no WhatsApp, montar PDF para cada aluno. Toda semana, do zero.',
  },
  {
    title: 'Sem dados para acompanhar evolução',
    body: 'Sem histórico de cargas, sem gráficos, sem comparativo de medidas. O aluno pergunta "estou evoluindo?" e você não tem como provar.',
  },
  {
    title: 'Impossível escalar sua base de alunos',
    body: 'Cada novo aluno é mais uma planilha, mais uma conversa, mais um arquivo. Sua agenda não cabe. Sua receita também não.',
  },
];

const TRAINER_PLANS = [
  {
    name: 'Free',
    price: 'R$ 0',
    unit: '/sempre',
    subtitle: 'Para experimentar sem pressa.',
    limit: 'Até 3 alunos',
    features: [
      ['Treinos ilimitados', true],
      ['Anamnese digital', true],
      ['App para alunos', true],
      ['Avaliações físicas', false],
      ['Marca branca', false],
    ],
  },
  {
    name: 'Starter',
    price: 'R$ 49,90',
    unit: '/mês',
    subtitle: 'R$ 39,90/mês no plano anual',
    limit: 'Até 15 alunos',
    features: [
      ['Tudo do Free', true],
      ['Avaliações físicas', true],
      ['Histórico de evolução', true],
      ['Vídeos personalizados', true],
      ['Marca branca', false],
    ],
  },
  {
    name: 'Pro',
    price: 'R$ 99,90',
    unit: '/mês',
    subtitle: 'R$ 79,90/mês no plano anual',
    limit: 'Até 50 alunos',
    badge: 'Mais Popular',
    highlight: true,
    features: [
      ['Tudo do Starter', true],
      ['Marca branca no app', true],
      ['Relatórios avançados', true],
      ['Integração WhatsApp', true],
      ['Suporte prioritário', true],
    ],
  },
  {
    name: 'Team',
    price: 'R$ 199,90',
    unit: '/mês',
    subtitle: 'R$ 159,90/mês no plano anual',
    limit: 'Alunos ilimitados',
    features: [
      ['Tudo do Pro', true],
      ['Multi-trainer até 5 contas', true],
      ['Permissões granulares', true],
      ['Onboarding dedicado', true],
      ['Gerente de conta', true],
    ],
  },
] satisfies Array<Plan>;

const STUDENT_PLANS = [
  {
    name: 'Free',
    price: 'R$ 0',
    unit: '/sempre',
    subtitle: 'Para começar a se mexer hoje.',
    limit: '2 planos ativos',
    features: [
      ['Treinos do seu personal', true],
      ['Acesso aos vídeos', true],
      ['Histórico básico', true],
      ['Histórico completo', false],
    ],
  },
  {
    name: 'Aluno Pro',
    price: 'R$ 14,90',
    unit: '/mês',
    subtitle: 'R$ 11,90/mês no plano anual',
    limit: 'Planos ilimitados',
    features: [
      ['Planos ilimitados', true],
      ['Histórico completo', true],
      ["Vídeos sem marca d'água", true],
      ['Modo offline avançado', true],
    ],
  },
] satisfies Array<Plan>;

const FAQ_ITEMS = [
  [
    'O Muvit funciona offline?',
    'Sim. Os alunos podem baixar o treino do dia e executar tudo sem internet. Quando reconectar, o histórico sincroniza automaticamente.',
  ],
  [
    'Posso migrar meus alunos de uma planilha?',
    'Importe seus alunos a partir de uma planilha CSV ou Excel em minutos. A nossa equipe ajuda gratuitamente em qualquer plano pago.',
  ],
  [
    'Como meus alunos acessam o treino?',
    'Pelo app Muvit, com login próprio e gratuito. Você convida pelo e-mail ou WhatsApp e o aluno entra direto no treino.',
  ],
  [
    'O app está disponível para iOS e Android?',
    'Sim. O app do aluno foi pensado para iOS e Android.',
  ],
  [
    'Posso cancelar minha assinatura a qualquer momento?',
    'Sim. Não há taxa de setup nem fidelidade: cancele quando quiser.',
  ],
  [
    'O que acontece quando atinjo o limite de alunos?',
    'Você pode fazer upgrade do plano sem perder dados, histórico ou acesso dos alunos.',
  ],
  [
    'Os alunos precisam pagar para usar o app?',
    'Não. O acesso básico do aluno é incluído nos planos do trainer.',
  ],
  ['Preciso de cartão de crédito para começar?', 'Não. O plano gratuito começa sem cartão.'],
];

const STAR_KEYS = ['star-1', 'star-2', 'star-3', 'star-4', 'star-5'];
const SOCIAL_LINKS = [
  { key: 'video', icon: Play },
  { key: 'chat', icon: MessageCircle },
  { key: 'love', icon: Heart },
];

interface Plan {
  name: string;
  price: string;
  unit: string;
  subtitle: string;
  limit: string;
  badge?: string;
  highlight?: boolean;
  features: Array<[label: string, enabled: boolean]>;
}

export default function LandingPage() {
  return (
    <div className="bg-mkt-light text-foreground">
      <Hero />

      <Section bg="dark" id="problem" designId="HjnTb">
        <SectionHead
          align="center"
          dark
          eyebrow="O problema"
          title="Chega de planilha, WhatsApp e PDF avulso."
        />
        <div className="grid gap-6 lg:grid-cols-3">
          {PROBLEM_CARDS.map((card, index) => (
            <article
              key={card.title}
              className="rounded-lg border border-white/10 bg-mkt-dark-elevated p-8"
            >
              <span className="font-display text-sm font-bold text-primary">
                {String(index + 1).padStart(2, '0')}
              </span>
              <h3 className="mt-8 font-display text-2xl font-bold text-mkt-on-dark">
                {card.title}
              </h3>
              <p className="mt-4 text-sm leading-7 text-mkt-on-dark-muted">{card.body}</p>
            </article>
          ))}
        </div>
        <div className="flex items-center justify-center gap-3 text-mkt-on-dark">
          <CheckCircle2 className="size-5 text-primary" />
          <span className="font-display text-lg font-semibold">
            O Muvit resolve isso de uma vez.
          </span>
        </div>
      </Section>

      <Section bg="light" id="features" designId="Syz4v">
        <SectionHead
          align="center"
          eyebrow="O que o Muvit faz"
          title="Tudo que faltava em um só lugar."
        />
        <FeatureRow
          eyebrow="Para trainers"
          title="Monte fichas completas em minutos."
          body="Arraste exercícios direto do banco, ajuste séries, repetições e cargas em segundos. Divida por treino A/B/C/D e replique para outros alunos com um clique."
          tags={['Drag & drop', 'Banco de exercícios', 'Divisão A/B/C/D']}
          visual={<WorkoutBuilderMock />}
        />
        <FeatureRow
          reverse
          eyebrow="Para trainers + alunos"
          title="Acompanhe a evolução de cada aluno, de verdade."
          body="Avaliações físicas com peso, % de gordura e medidas. Gráficos automáticos por treino, por aluno e por período. Mostre resultado de verdade."
          tags={['Gráficos de evolução', 'Avaliação física', 'Histórico completo']}
          visual={<ProgressMock />}
        />
        <FeatureRow
          eyebrow="Para alunos independentes"
          title="Treine por conta própria, com estrutura de profissional."
          body="Monte seus próprios treinos, registre cargas a cada série, acompanhe sua evolução em gráficos. Sem precisar de personal, mas com a mesma estrutura que ele usaria."
          tags={['Modo offline', 'Registro de cargas', 'Sem trainer necessário']}
          visual={<PhoneWorkoutMock />}
        />
      </Section>

      <Section bg="dark" id="audiences" designId="tSVLx">
        <SectionHead
          align="center"
          dark
          eyebrow="Para quem"
          title="Muvit para quem?"
          subtitle="Dois produtos, uma plataforma. Escolha a versão certa para você."
        />
        <div className="grid gap-6 lg:grid-cols-2">
          <AudienceCard
            badge="Recomendado"
            title="Para Personal Trainers"
            body="Profissionalize seu atendimento, escale sua base de alunos e mostre resultados de verdade."
            items={[
              'Construtor de fichas com banco de exercícios',
              'Avaliação física + gráficos por aluno',
              'App branded para entregar ao seu aluno',
              'Dashboard de retenção, frequência e cobranças',
            ]}
            footer="Sem cartão de crédito · 14 dias de teste"
            highlight
          />
          <AudienceCard
            badge="Autodidata"
            title="Para Alunos Independentes"
            body="Treine sozinho com a mesma estrutura que um personal usaria com você. Sem complicação."
            items={[
              'Monte os próprios treinos no app',
              'Registre cargas, séries e repetições rapidamente',
              'Acompanhe sua evolução com gráficos automáticos',
              'Funciona offline na academia',
            ]}
            footer="Plano gratuito · upgrade quando quiser"
          />
        </div>
      </Section>

      <Section bg="light" id="testimonials" designId="LBhCV">
        <SectionHead
          align="center"
          eyebrow="Prova social"
          title="Trainers que pararam de usar planilha."
        />
        <div className="grid gap-6 lg:grid-cols-3">
          {[
            [
              '“Eu economizo 6 horas por semana só de não ter que reescrever planilha. E meus alunos finalmente entendem o que é pra fazer.”',
              'Rafael Costa',
              'Personal Trainer · São Paulo',
            ],
            [
              '“O gráfico de evolução é o que segura aluno. Mostro o antes e depois e ele renova sem questionar. Já é meu fluxo padrão.”',
              'Juliana Mendes',
              'Personal Trainer · Belo Horizonte',
            ],
            [
              '“Triplicar minha base sem virar bagunça era impossível. Hoje atendo 80 alunos com a mesma qualidade que atendia 25.”',
              'Diego Almeida',
              'Personal Trainer · Florianópolis',
            ],
          ].map(([quote, name, role]) => (
            <article
              key={name}
              className="flex min-h-72 flex-col gap-6 rounded-lg border border-mkt-card-border bg-card p-8 shadow-card"
            >
              <div className="flex gap-1 text-warning">
                {STAR_KEYS.map((key) => (
                  <Star key={key} className="size-4 fill-current" />
                ))}
              </div>
              <p className="flex-1 text-lg leading-8 text-foreground">{quote}</p>
              <div>
                <p className="font-display text-lg font-bold">{name}</p>
                <p className="mt-1 text-sm text-muted-foreground">{role}</p>
              </div>
            </article>
          ))}
        </div>
        <div className="grid gap-6 rounded-lg border border-mkt-card-border bg-card p-8 shadow-card lg:grid-cols-3">
          <Stat value="+2.500" label="trainers ativos" />
          <Stat value="+45 mil" label="alunos cadastrados" />
          <Stat value="4,9" label="avaliação média na App Store" />
        </div>
      </Section>

      <Section bg="dark" id="how" designId="fT8gq">
        <SectionHead
          align="center"
          dark
          eyebrow="Como funciona"
          title="Do cadastro ao primeiro treino em menos de 5 minutos."
        />
        <div className="grid gap-4 lg:grid-cols-4">
          {[
            ['01', 'Crie sua conta', 'Grátis, sem cartão de crédito. Leva menos de 30 segundos.'],
            [
              '02',
              'Cadastre seu aluno',
              'Nome, objetivo e restrições. Pode importar do CSV ou WhatsApp.',
            ],
            [
              '03',
              'Monte a ficha',
              'Banco completo de exercícios + drag-and-drop. Em poucos cliques.',
            ],
            ['04', 'Compartilhe', 'Acesso pelo app + push notifications. Pronto para treinar.'],
          ].map(([number, title, body]) => (
            <article
              key={number}
              className="rounded-lg border border-white/10 bg-mkt-dark-elevated p-8 text-mkt-on-dark"
            >
              <span className="font-display text-4xl font-bold text-primary">{number}</span>
              <h3 className="mt-8 font-display text-xl font-bold">{title}</h3>
              <p className="mt-3 text-sm leading-7 text-mkt-on-dark-muted">{body}</p>
            </article>
          ))}
        </div>
      </Section>

      <Section bg="light" id="pricing" designId="VdWtx">
        <SectionHead
          align="center"
          eyebrow="Preços"
          title="Simples e transparente. Comece grátis, cresça no seu ritmo."
          subtitle="Sem taxa de setup. Cancele quando quiser. Sem cartão de crédito para começar."
        />
        <div className="inline-flex self-center rounded-pill bg-card p-1 shadow-subtle">
          <span className="rounded-pill bg-primary px-5 py-2 font-display text-sm font-bold text-primary-foreground">
            Mensal
          </span>
          <span className="px-5 py-2 font-display text-sm font-semibold text-muted-foreground">
            Anual · economize 20%
          </span>
        </div>
        <PricingGroup title="Para Personal Trainers" plans={TRAINER_PLANS} />
        <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground">
          <span>Cancele quando quiser</span>
          <span>·</span>
          <span>Sem taxa de setup</span>
          <span>·</span>
          <span>Suporte em português</span>
        </div>
        <PricingGroup
          title="Para quem treina com personal ou por conta própria"
          plans={STUDENT_PLANS}
          compact
        />
      </Section>

      <Section bg="light" id="faq" designId="L7n46">
        <SectionHead
          align="center"
          eyebrow="FAQ"
          title="Perguntas frequentes."
          subtitle="Tudo que você quer saber antes de começar, sem letras miúdas."
        />
        <div className="mx-auto w-full max-w-4xl divide-y divide-mkt-card-border rounded-lg border border-mkt-card-border bg-card">
          {FAQ_ITEMS.map(([question, answer], index) => (
            <details
              key={question}
              className="group p-6 open:bg-card-hover [&_summary::-webkit-details-marker]:hidden"
              open={index < 2}
            >
              <summary className="flex cursor-pointer items-center justify-between gap-4 font-display text-lg font-bold">
                {question}
                <span className="grid size-8 shrink-0 place-items-center rounded-pill border border-border text-muted-foreground transition group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground">{answer}</p>
            </details>
          ))}
        </div>
        <div className="flex items-center justify-center gap-2 text-sm">
          <span className="text-muted-foreground">Não encontrou sua dúvida?</span>
          <Link href="mailto:hi@muvit.app" className="font-display font-bold text-primary">
            Fale com a gente →
          </Link>
        </div>
      </Section>

      <section
        data-design-id="iYPEt"
        className="bg-mkt-hero py-20 text-center text-mkt-on-dark md:py-28"
      >
        <div className="mx-auto flex max-w-container flex-col items-center gap-8 px-6 lg:px-20">
          <h2 className="max-w-5xl font-display text-4xl font-bold leading-tight tracking-normal md:text-[64px] md:leading-[1.05]">
            Seu próximo aluno merece uma ficha melhor do que uma planilha.
          </h2>
          <p className="text-base text-mkt-on-dark/85 md:text-xl">
            Comece agora. É gratuito, sem limite de tempo no plano free.
          </p>
          <div className="flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center">
            <Button asChild size="xl" className="rounded-pill">
              <Link href="/signup">
                Criar conta grátis <ArrowRight />
              </Link>
            </Button>
            <Button
              asChild
              size="xl"
              variant="outline"
              className="rounded-pill border-white/30 bg-white/5 text-mkt-on-dark hover:bg-white/15"
            >
              <Link href="mailto:hi@muvit.app">Falar com a equipe</Link>
            </Button>
          </div>
          <TrustRow centered />
        </div>
      </section>

      <Footer />
    </div>
  );
}

function Hero() {
  return (
    <section
      data-design-id="T1Qw3"
      className="relative overflow-hidden bg-mkt-hero text-mkt-on-dark"
    >
      <Navbar />
      <div className="mx-auto grid max-w-container items-center gap-12 px-6 pb-16 pt-10 md:pb-28 md:pt-12 lg:grid-cols-[1fr_560px] lg:px-20">
        <div className="flex flex-col gap-7">
          <span className="inline-flex w-fit items-center gap-2 rounded-pill border border-white/30 bg-white/15 px-4 py-1.5 font-display text-[11px] font-bold uppercase tracking-[0.16em]">
            <Sparkles className="size-3.5" /> O app que seu treino merecia
          </span>
          <h1 className="font-display text-[42px] font-bold leading-[1.05] tracking-normal md:text-[72px]">
            Gerencie seus alunos.
            <br />
            Evolua <span className="italic text-[#a8f0c4]">seus treinos.</span>
          </h1>
          <p className="max-w-2xl text-base leading-8 text-[#e8f8f0] md:text-lg">
            Do personal trainer que gerencia 30 alunos ao atleta que treina sozinho, o Muvit
            organiza sua rotina, registra sua evolução e elimina as planilhas de uma vez por todas.
          </p>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Button asChild size="xl" className="rounded-pill">
              <Link href="/signup">
                Comece grátis <ArrowRight />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="xl"
              className="rounded-pill border-white/30 bg-white/5 text-mkt-on-dark hover:bg-white/15"
            >
              <Link href="#how">Ver como funciona →</Link>
            </Button>
          </div>
          <TrustRow />
        </div>
        <HeroMock />
      </div>
    </section>
  );
}

function Navbar() {
  return (
    <nav className="border-b border-white/10">
      <div className="mx-auto flex max-w-container items-center justify-between px-6 py-4 lg:px-20 lg:py-5">
        <Logo variant="on-dark" size="md" />
        <div className="hidden items-center gap-9 lg:flex">
          {NAV_LINKS.map(([label, href]) => (
            <Link
              key={`${label}-${href}`}
              href={href}
              className="font-display text-sm font-semibold text-white/90"
            >
              {label}
            </Link>
          ))}
        </div>
        <div className="hidden items-center gap-3 sm:flex">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="rounded-pill border-white/25 bg-white/5 text-mkt-on-dark hover:bg-white/15"
          >
            <Link href="/login">Entrar</Link>
          </Button>
          <Button asChild size="sm" className="rounded-pill">
            <Link href="/signup">Começar grátis</Link>
          </Button>
        </div>
        <details className="group sm:hidden">
          <summary className="grid size-10 cursor-pointer list-none place-items-center rounded-pill bg-white/15 [&::-webkit-details-marker]:hidden">
            <Menu className="size-5 group-open:hidden" />
            <X className="hidden size-5 group-open:block" />
          </summary>
          <div
            data-design-id="CPbTy"
            className="absolute inset-x-0 top-[73px] z-20 flex flex-col gap-6 bg-mkt-dark px-8 py-8 shadow-elevated"
          >
            {NAV_LINKS.map(([label, href]) => (
              <Link
                key={`${label}-${href}`}
                href={href}
                className="flex items-center justify-between border-b border-white/10 py-4 font-display text-xl font-bold text-mkt-on-dark"
              >
                {label}
                <ChevronRight className="size-5 text-primary" />
              </Link>
            ))}
            <Button asChild size="xl" className="rounded-pill">
              <Link href="/signup">Comece grátis</Link>
            </Button>
            <Button asChild variant="ghost" size="xl" className="text-mkt-on-dark">
              <Link href="/login">Entrar</Link>
            </Button>
          </div>
        </details>
      </div>
    </nav>
  );
}

function HeroMock() {
  return (
    <div className="relative mx-auto hidden h-[480px] w-full max-w-[560px] lg:block">
      <div className="absolute inset-x-0 top-6 rounded-lg border border-white/20 bg-white/95 p-4 text-foreground shadow-elevated">
        <div className="mb-4 flex items-center justify-between rounded-md bg-mkt-dark px-4 py-3 text-xs text-mkt-on-dark">
          <span className="font-display font-bold">app.muvit.com.br/dashboard</span>
          <span className="rounded-pill bg-primary px-2 py-1 text-[10px] text-primary-foreground">
            ONLINE
          </span>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <MiniMetric label="Alunos ativos" value="32" detail="+4 este mês" />
          <MiniMetric label="Treinos hoje" value="18" detail="75% concluídos" />
          <MiniMetric label="Aderência" value="94%" detail="Acima da média" />
        </div>
        <div className="mt-5 rounded-lg border border-mkt-card-border bg-card p-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-lg font-bold">Alunos</h3>
            <span className="text-sm font-semibold text-primary">Ver todos →</span>
          </div>
          {[
            ['MR', 'Mariana Rocha', 'Treino A · 4x semana'],
            ['PG', 'Pedro Galvão', 'Hipertrofia · 5x semana'],
            ['LS', 'Letícia Souza', 'Emagrecimento · 3x semana'],
          ].map(([initials, name, meta]) => (
            <div key={name} className="flex items-center gap-3 border-t border-border py-3">
              <span className="grid size-10 place-items-center rounded-pill bg-primary font-display font-bold text-primary-foreground">
                {initials}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-display font-bold">{name}</p>
                <p className="text-xs text-muted-foreground">{meta}</p>
              </div>
              <span className="rounded-pill bg-success-bg px-3 py-1 text-xs font-bold text-[#1b7a3d]">
                Ativo
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="absolute -bottom-4 right-4 w-52 rounded-[28px] border-4 border-mkt-dark bg-mkt-dark p-3 text-mkt-on-dark shadow-elevated">
        <div className="mb-4 flex items-center justify-between text-xs">
          <span>9:41</span>
          <Smartphone className="size-4" />
        </div>
        <p className="font-display text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
          Treino de hoje
        </p>
        <h3 className="mt-2 font-display text-xl font-bold">Peito + Tríceps</h3>
        <p className="mt-1 text-xs text-mkt-on-dark-muted">6 exercícios · 45min</p>
        <div className="mt-4 flex flex-col gap-2">
          {[
            ['✓', 'Supino reto', '4 × 10'],
            ['2', 'Crucifixo inclinado', '3 × 12'],
            ['3', 'Tríceps pulley', '4 × 12'],
          ].map(([n, name, sets]) => (
            <div key={name} className="flex items-center gap-2 rounded-md bg-white/10 p-2">
              <span className="grid size-6 place-items-center rounded-pill bg-primary text-xs font-bold">
                {n}
              </span>
              <span className="min-w-0 flex-1 truncate text-xs font-semibold">{name}</span>
              <span className="text-[10px] text-mkt-on-dark-muted">{sets}</span>
            </div>
          ))}
        </div>
        <Button className="mt-4 h-10 w-full rounded-pill text-xs">Continuar treino</Button>
      </div>
    </div>
  );
}

function TrustRow({ centered = false }: { centered?: boolean }) {
  return (
    <ul
      className={`flex flex-col gap-2 text-sm text-[#e8f8f0] sm:flex-row sm:gap-6 ${centered ? 'items-center justify-center' : ''}`}
    >
      {TRUST_ITEMS.map(({ icon: Icon, label }) => (
        <li key={label} className="inline-flex items-center gap-2">
          <Icon className="size-4 text-[#a8f0c4]" />
          <span>{label}</span>
        </li>
      ))}
    </ul>
  );
}

function Section({
  bg,
  id,
  designId,
  children,
}: {
  bg: 'dark' | 'light';
  id: string;
  designId: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      data-design-id={designId}
      className={`${bg === 'dark' ? 'bg-mkt-dark text-mkt-on-dark' : 'bg-mkt-light'} py-20 md:py-28`}
    >
      <div className="mx-auto flex max-w-container flex-col gap-12 px-6 lg:gap-16 lg:px-20">
        {children}
      </div>
    </section>
  );
}

function SectionHead({
  eyebrow,
  title,
  subtitle,
  dark,
  align = 'left',
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  dark?: boolean;
  align?: 'left' | 'center';
}) {
  const centered = align === 'center';
  return (
    <header
      className={`flex max-w-4xl flex-col gap-4 ${centered ? 'mx-auto items-center text-center' : ''}`}
    >
      <span className="font-display text-[13px] font-bold uppercase tracking-[0.14em] text-primary">
        {eyebrow}
      </span>
      <h2
        className={`font-display text-3xl font-bold leading-tight tracking-normal md:text-5xl md:leading-[1.1] ${dark ? 'text-mkt-on-dark' : 'text-foreground'}`}
      >
        {title}
      </h2>
      {subtitle && (
        <p
          className={`max-w-2xl text-base leading-7 md:text-lg ${dark ? 'text-mkt-on-dark-muted' : 'text-muted-foreground'}`}
        >
          {subtitle}
        </p>
      )}
    </header>
  );
}

function FeatureRow({
  eyebrow,
  title,
  body,
  tags,
  visual,
  reverse,
}: {
  eyebrow: string;
  title: string;
  body: string;
  tags: string[];
  visual: React.ReactNode;
  reverse?: boolean;
}) {
  return (
    <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-20">
      <div className={reverse ? 'lg:order-2' : undefined}>{visual}</div>
      <div className="flex flex-col gap-6">
        <span className="font-display text-[12px] font-bold uppercase tracking-[0.14em] text-primary">
          {eyebrow}
        </span>
        <h3 className="font-display text-3xl font-bold leading-tight md:text-4xl">{title}</h3>
        <p className="text-base leading-8 text-muted-foreground">{body}</p>
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="rounded-pill border border-mkt-card-border bg-card px-4 py-2 font-display text-xs font-bold text-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function WorkoutBuilderMock() {
  return (
    <div className="rounded-lg border border-mkt-card-border bg-card p-6 shadow-card">
      <div className="mb-5 flex items-center justify-between">
        <h4 className="font-display text-xl font-bold">Construtor de Treinos</h4>
        <Dumbbell className="size-5 text-primary" />
      </div>
      <div className="grid gap-4 md:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-lg bg-muted p-4">
          <p className="mb-3 font-display text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            Banco de exercícios
          </p>
          {['Supino reto', 'Crucifixo', 'Tríceps corda', 'Pulldown'].map((item) => (
            <div key={item} className="mb-2 rounded-md bg-card px-3 py-2 text-sm font-semibold">
              {item}
            </div>
          ))}
        </div>
        <div className="rounded-lg border border-primary/30 bg-success-bg p-4">
          <p className="mb-3 font-display text-[11px] font-bold uppercase tracking-[0.12em] text-primary">
            Treino A — Peito & Tríceps
          </p>
          {[
            ['1', 'Supino reto', '4 x 10 · 60kg'],
            ['2', 'Crucifixo inclinado', '3 x 12 · 14kg'],
          ].map(([n, name, meta]) => (
            <div key={name} className="mb-3 flex items-center gap-3 rounded-md bg-card p-3">
              <span className="grid size-7 place-items-center rounded-pill bg-primary text-xs font-bold text-primary-foreground">
                {n}
              </span>
              <div>
                <p className="font-display text-sm font-bold">{name}</p>
                <p className="text-xs text-muted-foreground">{meta}</p>
              </div>
            </div>
          ))}
          <div className="rounded-md border border-dashed border-primary/60 px-3 py-4 text-center text-sm font-semibold text-primary">
            Solte aqui o próximo exercício
          </div>
        </div>
      </div>
    </div>
  );
}

function ProgressMock() {
  return (
    <div className="rounded-lg border border-mkt-card-border bg-card p-6 shadow-card">
      <div className="mb-5 flex items-center gap-3">
        <span className="grid size-12 place-items-center rounded-pill bg-primary font-display font-bold text-primary-foreground">
          MS
        </span>
        <div>
          <p className="font-display text-lg font-bold">Marina Souza</p>
          <p className="text-sm text-muted-foreground">Hipertrofia · 8 semanas</p>
        </div>
        <span className="ml-auto rounded-pill bg-success-bg px-3 py-1 text-xs font-bold text-[#1b7a3d]">
          Ativo
        </span>
      </div>
      <div className="rounded-lg bg-muted p-5">
        <div className="flex items-end justify-between">
          <div>
            <p className="font-display text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Peso corporal
            </p>
            <p className="mt-2 font-display text-4xl font-bold">-3,2 kg</p>
          </div>
          <BarChart3 className="size-10 text-primary" />
        </div>
        <div className="mt-8 flex h-32 items-end gap-3">
          {[30, 42, 48, 60, 66, 78, 88, 96].map((height, index) => (
            <div key={height} className="flex flex-1 flex-col items-center gap-2">
              <div className="w-full rounded-t-md bg-primary" style={{ height }} />
              <span className="text-[10px] text-muted-foreground">S{index + 1}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PhoneWorkoutMock() {
  return (
    <div className="mx-auto max-w-sm rounded-[32px] border-8 border-mkt-dark bg-mkt-dark p-4 text-mkt-on-dark shadow-elevated">
      <div className="mb-6 flex items-center justify-between text-sm">
        <span>9:41</span>
        <Clock3 className="size-4" />
      </div>
      <p className="font-display text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
        Treino A
      </p>
      <div className="mt-4 rounded-lg bg-white/10 p-4">
        <div className="mb-4 flex items-center justify-between">
          <h4 className="font-display text-xl font-bold">Supino reto</h4>
          <span className="rounded-pill bg-primary/20 px-3 py-1 text-xs text-primary">00:42</span>
        </div>
        <p className="text-sm text-mkt-on-dark-muted">Série 3 de 4</p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-md bg-white/10 p-3 text-center">
            <p className="font-display text-2xl font-bold">60 kg</p>
            <p className="text-xs text-mkt-on-dark-muted">Carga</p>
          </div>
          <div className="rounded-md bg-white/10 p-3 text-center">
            <p className="font-display text-2xl font-bold">10</p>
            <p className="text-xs text-mkt-on-dark-muted">Reps</p>
          </div>
        </div>
        <Button className="mt-5 w-full rounded-pill">Concluir série</Button>
      </div>
    </div>
  );
}

function AudienceCard({
  badge,
  title,
  body,
  items,
  footer,
  highlight,
}: {
  badge: string;
  title: string;
  body: string;
  items: string[];
  footer: string;
  highlight?: boolean;
}) {
  return (
    <article
      className={`rounded-lg p-8 ${highlight ? 'border-2 border-primary bg-mkt-dark-elevated' : 'border border-white/10 bg-white/5'}`}
    >
      <span className="rounded-pill bg-primary/15 px-3 py-1 font-display text-[11px] font-bold uppercase tracking-[0.12em] text-primary">
        {badge}
      </span>
      <h3 className="mt-6 font-display text-3xl font-bold text-mkt-on-dark">{title}</h3>
      <p className="mt-4 leading-7 text-mkt-on-dark-muted">{body}</p>
      <ul className="mt-8 flex flex-col gap-4">
        {items.map((item) => (
          <li key={item} className="flex gap-3 text-sm text-mkt-on-dark">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
      <p className="mt-8 text-sm font-semibold text-primary">{footer}</p>
    </article>
  );
}

function PricingGroup({
  title,
  plans,
  compact,
}: { title: string; plans: Plan[]; compact?: boolean }) {
  return (
    <div>
      <h3 className="mb-6 text-center font-display text-sm font-bold uppercase tracking-[0.14em] text-muted-foreground">
        {title}
      </h3>
      <div className={`grid gap-5 ${compact ? 'lg:grid-cols-2' : 'lg:grid-cols-4'}`}>
        {plans.map((plan) => (
          <PriceCard key={plan.name} plan={plan} />
        ))}
      </div>
    </div>
  );
}

function PriceCard({ plan }: { plan: Plan }) {
  return (
    <article
      className={`flex flex-col rounded-lg border bg-card p-6 shadow-card ${plan.highlight ? 'border-primary ring-2 ring-primary/20' : 'border-mkt-card-border'}`}
    >
      <div className="flex min-h-8 items-center justify-between gap-3">
        <h4 className="font-display text-xl font-bold">{plan.name}</h4>
        {plan.badge && (
          <span className="rounded-pill bg-success-bg px-3 py-1 text-[10px] font-bold uppercase text-[#1b7a3d]">
            {plan.badge}
          </span>
        )}
      </div>
      <div className="mt-6 flex items-baseline gap-1">
        <span className="font-display text-4xl font-bold">{plan.price}</span>
        <span className="text-sm text-muted-foreground">{plan.unit}</span>
      </div>
      <p className="mt-2 min-h-10 text-sm text-muted-foreground">{plan.subtitle}</p>
      <p className="mt-4 rounded-md bg-muted px-3 py-2 text-sm font-bold">{plan.limit}</p>
      <ul className="mt-6 flex flex-1 flex-col gap-3 text-sm">
        {plan.features.map(([feature, enabled]) => (
          <li key={feature} className={enabled ? 'flex gap-2' : 'flex gap-2 text-muted-foreground'}>
            {enabled ? (
              <Check className="mt-0.5 size-4 shrink-0 text-primary" />
            ) : (
              <span className="mt-0.5 inline-block size-4 shrink-0 text-center">—</span>
            )}
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      <Button
        asChild
        className="mt-8 rounded-pill"
        variant={plan.highlight ? 'default' : 'secondary'}
      >
        <Link href="/signup">Começar agora</Link>
      </Button>
    </article>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <p className="font-display text-4xl font-bold text-foreground">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

function MiniMetric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-lg bg-muted p-4">
      <p className="font-display text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-3 font-display text-3xl font-bold">{value}</p>
      <p className="mt-2 text-xs text-primary">{detail}</p>
    </div>
  );
}

function Footer() {
  return (
    <footer data-design-id="WWQSJ" className="bg-mkt-dark py-12 text-mkt-on-dark-muted md:py-16">
      <div className="mx-auto flex max-w-container flex-col gap-10 px-6 lg:px-20">
        <div className="grid gap-10 lg:grid-cols-[320px_1fr]">
          <div className="flex flex-col gap-4">
            <Logo variant="default" size="lg" />
            <p className="max-w-sm text-sm leading-7">
              A plataforma de treinos para quem leva fitness a sério.
            </p>
            <div className="flex gap-2">
              {SOCIAL_LINKS.map(({ key, icon: Icon }) => (
                <span
                  key={key}
                  className="grid size-9 place-items-center rounded-pill bg-white/10 text-mkt-on-dark"
                >
                  <Icon className="size-4" />
                </span>
              ))}
            </div>
          </div>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <FooterCol
              title="Produto"
              links={['Funcionalidades', 'Para Trainers', 'Para Alunos', 'Preços', 'Changelog']}
            />
            <FooterCol title="Empresa" links={['Sobre', 'Blog', 'Imprensa', 'Trabalhe conosco']} />
            <FooterCol
              title="Suporte"
              links={[
                'Central de ajuda',
                'Contato',
                'Status',
                'Política de privacidade',
                'Termos de uso',
              ]}
            />
            <FooterCol title="Redes sociais" links={['Instagram', 'YouTube', 'LinkedIn']} />
          </div>
        </div>
        <div className="flex flex-col gap-2 border-t border-white/10 pt-8 text-xs md:flex-row md:items-center md:justify-between">
          <span>© 2026 Muvit Tecnologia Ltda. · CNPJ 00.000.000/0001-00</span>
          <span>Feito com carinho no Brasil</span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: string[] }) {
  return (
    <div className="flex flex-col gap-3">
      <span className="font-display text-[11px] font-bold uppercase tracking-[0.12em] text-mkt-on-dark">
        {title}
      </span>
      <ul className="flex flex-col gap-2 text-sm">
        {links.map((label) => (
          <li key={label}>
            <Link href="#" className="hover:text-mkt-on-dark">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
