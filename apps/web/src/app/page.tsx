import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Dumbbell,
  LineChart,
  MessageSquareHeart,
  Rocket,
  Smartphone,
  Sparkles,
  Star,
  Users,
} from 'lucide-react';
import Link from 'next/link';

const STAR_KEYS = ['star-1', 'star-2', 'star-3', 'star-4', 'star-5'];
const NAV_LINKS: Array<[label: string, href: string]> = [
  ['Funcionalidades', '#features'],
  ['Como funciona', '#how'],
  ['Planos', '#pricing'],
  ['FAQ', '#faq'],
];

export default function LandingPage() {
  return (
    <div className="bg-mkt-light text-foreground">
      {/* HERO */}
      <section className="relative overflow-hidden bg-mkt-hero text-mkt-on-dark">
        <Navbar />
        <div className="mx-auto max-w-container px-6 pb-24 pt-16 lg:px-20 lg:pb-32 lg:pt-24">
          <div className="grid items-center gap-12 lg:grid-cols-[1.15fr_1fr]">
            <div className="flex flex-col gap-8">
              <span className="inline-flex w-fit items-center gap-2 rounded-pill border border-white/30 bg-white/10 px-4 py-1.5 font-display text-xs font-semibold uppercase tracking-[0.12em]">
                <Sparkles className="size-3.5" /> Beta · 2026
              </span>
              <h1 className="font-display font-bold tracking-tight text-[44px] leading-[1.05] lg:text-hero-display">
                A plataforma de treinos que cresce com seu negócio.
              </h1>
              <p className="max-w-2xl text-lg leading-relaxed text-mkt-on-dark/85 lg:text-hero-lead">
                Cadastre alunos, monte planos a partir da maior biblioteca de exercícios e acompanhe
                a evolução com avaliações físicas e logs em tempo real — num só lugar.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Button asChild variant="cta" size="xl">
                  <Link href="/signup" className="gap-2">
                    Começar grátis <ArrowRight />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="xl"
                  className="border-white/30 bg-white/5 text-mkt-on-dark hover:bg-white/15"
                >
                  <Link href="#features">Ver funcionalidades</Link>
                </Button>
              </div>
              <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-mkt-on-dark/80">
                <Li>Sem cartão de crédito</Li>
                <Li>Web + app nativo</Li>
                <Li>Suporte em PT-BR</Li>
              </ul>
            </div>

            <HeroPreview />
          </div>
        </div>
      </section>

      <Section bg="dark" id="problem">
        <SectionHead
          eyebrow="O problema"
          title="Personal trainers perdem horas por semana com planilhas e mensagens soltas."
          subtitle="A gestão fragmentada limita o crescimento. Muvit centraliza tudo num fluxo só."
          dark
        />
        <div className="grid gap-4 lg:grid-cols-3">
          {[
            {
              title: 'Planilhas que somem',
              body: 'Treinos espalhados em PDFs, prints e papéis que ninguém acha quando precisa.',
            },
            {
              title: 'Sem visibilidade do aluno',
              body: 'Você não sabe se ele treinou, com que carga, ou quanto evoluiu desde a última avaliação.',
            },
            {
              title: 'Mensagens infinitas',
              body: 'WhatsApp como CRM, prontuário e biblioteca ao mesmo tempo. Não escala.',
            },
          ].map((c) => (
            <article
              key={c.title}
              className="rounded-lg border border-white/10 bg-mkt-dark-elevated p-6"
            >
              <h3 className="mb-2 font-display text-xl font-bold text-mkt-on-dark">{c.title}</h3>
              <p className="text-sm leading-relaxed text-mkt-on-dark-muted">{c.body}</p>
            </article>
          ))}
        </div>
      </Section>

      <Section bg="light" id="features">
        <SectionHead
          eyebrow="Funcionalidades"
          title="Tudo que você precisa para entregar treinos profissionais."
          subtitle="Construído com personal trainers brasileiros desde o dia zero."
        />
        <div className="grid gap-6 lg:grid-cols-3">
          {[
            {
              icon: Users,
              title: 'Gestão de alunos',
              body: 'Perfis completos com objetivos, restrições, histórico e status. Convide via link.',
            },
            {
              icon: ClipboardList,
              title: 'Editor de treinos',
              body: 'Monte planos com até 7 dias, séries, repetições, carga, descanso e tempo.',
            },
            {
              icon: Dumbbell,
              title: 'Biblioteca de exercícios',
              body: 'Globais cobrindo principais grupos musculares + customs ilimitados.',
            },
            {
              icon: LineChart,
              title: 'Avaliações + evolução',
              body: 'Peso, % de gordura e medidas com gráfico de evolução automático.',
            },
            {
              icon: Smartphone,
              title: 'App do aluno',
              body: 'Aluno vê o treino do dia, registra séries e cargas direto no celular.',
            },
            {
              icon: MessageSquareHeart,
              title: 'Notificações',
              body: 'Lembretes diários e atualizações importantes via push e e-mail.',
            },
          ].map((f) => (
            <FeatureCard key={f.title} icon={f.icon} title={f.title} body={f.body} />
          ))}
        </div>
      </Section>

      <Section bg="dark" id="audiences">
        <SectionHead
          eyebrow="Para quem"
          title="Construído para personal trainers — e poderoso para alunos independentes."
          dark
        />
        <div className="grid gap-6 lg:grid-cols-2">
          <article className="rounded-lg border-2 border-primary bg-mkt-dark-elevated p-8">
            <span className="inline-flex items-center gap-2 rounded-pill bg-primary/15 px-3 py-1 font-display text-[11px] font-semibold uppercase tracking-[0.08em] text-primary">
              Personal trainer
            </span>
            <h3 className="mt-4 font-display text-2xl font-bold text-mkt-on-dark">
              Cresça sua carteira sem virar planilha.
            </h3>
            <ul className="mt-6 flex flex-col gap-3 text-mkt-on-dark/85">
              <Bullet>Alunos ilimitados, treinos ilimitados</Bullet>
              <Bullet>App branded para o seu aluno</Bullet>
              <Bullet>Acompanhamento de logs em tempo real</Bullet>
              <Bullet>Avaliações físicas com gráfico</Bullet>
            </ul>
          </article>

          <article className="rounded-lg border border-white/10 bg-white/5 p-8">
            <span className="inline-flex items-center gap-2 rounded-pill bg-white/15 px-3 py-1 font-display text-[11px] font-semibold uppercase tracking-[0.08em] text-mkt-on-dark">
              Aluno independente
            </span>
            <h3 className="mt-4 font-display text-2xl font-bold text-mkt-on-dark">
              Treine com método sem precisar de personal.
            </h3>
            <ul className="mt-6 flex flex-col gap-3 text-mkt-on-dark/85">
              <Bullet>Crie seu próprio plano em minutos</Bullet>
              <Bullet>Biblioteca de exercícios global</Bullet>
              <Bullet>Registre cargas e veja sua evolução</Bullet>
              <Bullet>Tudo de graça no plano free</Bullet>
            </ul>
          </article>
        </div>
      </Section>

      <Section bg="light" id="testimonials">
        <SectionHead
          eyebrow="Quem usa"
          title="Personal trainers brasileiros estão escalando com a Muvit."
        />
        <div className="grid gap-5 lg:grid-cols-3">
          {[
            {
              name: 'Renata Souza',
              role: 'Personal · São Paulo',
              quote:
                '"Saí de planilhas e WhatsApp. Hoje recebo logs de treino dos meus 32 alunos sem precisar perguntar."',
            },
            {
              name: 'Carlos Andrade',
              role: 'Personal · Rio de Janeiro',
              quote:
                '"Os gráficos de evolução fecham a venda na 1ª reavaliação. Aluno vê o progresso e renova."',
            },
            {
              name: 'Aline Pires',
              role: 'Aluna independente',
              quote:
                '"Comecei a treinar sem personal e o Muvit me deu estrutura. Em 3 meses já tinha histórico para mostrar."',
            },
          ].map((t) => (
            <article
              key={t.name}
              className="flex flex-col gap-5 rounded-lg border border-mkt-card-border bg-card p-6 shadow-card"
            >
              <div className="flex gap-0.5 text-warning">
                {STAR_KEYS.map((key) => (
                  <Star key={key} className="size-4 fill-current" />
                ))}
              </div>
              <p className="text-base leading-relaxed text-foreground">{t.quote}</p>
              <div className="flex flex-col">
                <span className="font-display font-semibold">{t.name}</span>
                <span className="text-xs text-muted-foreground">{t.role}</span>
              </div>
            </article>
          ))}
        </div>
        <div className="grid gap-6 rounded-lg border border-mkt-card-border bg-card p-8 lg:grid-cols-4">
          <Stat value="200+" label="Personal trainers" />
          <Stat value="3.4K" label="Alunos ativos" />
          <Stat value="42K" label="Sessões registradas" />
          <Stat value="4.9★" label="App Store · Play" />
        </div>
      </Section>

      <Section bg="dark" id="how">
        <SectionHead
          eyebrow="Como funciona"
          title="Do cadastro à primeira avaliação em 5 minutos."
          dark
        />
        <ol className="grid gap-4 lg:grid-cols-4">
          {[
            { n: '01', title: 'Crie sua conta', body: 'Sem cartão. 2 minutos.' },
            { n: '02', title: 'Importe seus alunos', body: 'Em massa via planilha ou um a um.' },
            { n: '03', title: 'Monte os treinos', body: 'Use templates ou comece do zero.' },
            { n: '04', title: 'Acompanhe', body: 'Logs e evolução automaticamente.' },
          ].map((s) => (
            <li
              key={s.n}
              className="rounded-lg border border-white/10 bg-mkt-dark-elevated p-6 text-mkt-on-dark"
            >
              <span className="font-display text-3xl font-bold text-primary">{s.n}</span>
              <h3 className="mt-3 font-display text-lg font-bold">{s.title}</h3>
              <p className="mt-2 text-sm text-mkt-on-dark-muted">{s.body}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section bg="light" id="pricing">
        <SectionHead
          eyebrow="Planos"
          title="Comece grátis. Faça upgrade quando seu negócio pedir."
        />
        <div className="grid gap-6 lg:grid-cols-3">
          <PriceCard
            name="Solo"
            price="Grátis"
            tagline="Para começar"
            features={['Até 5 alunos', 'Biblioteca global', 'Avaliações físicas', 'App do aluno']}
          />
          <PriceCard
            name="Pro"
            price="R$ 79"
            unit="/mês"
            tagline="Mais popular"
            highlight
            features={[
              'Alunos ilimitados',
              'Exercícios customs ilimitados',
              'Notificações push + e-mail',
              'Relatórios de evolução',
              'Suporte prioritário',
            ]}
          />
          <PriceCard
            name="Studio"
            price="R$ 199"
            unit="/mês"
            tagline="Para academias"
            features={[
              'Tudo do Pro',
              'Multi-personal (até 5)',
              'Marca personalizada',
              'Acesso à API',
            ]}
          />
        </div>
      </Section>

      <Section bg="light" id="faq">
        <SectionHead eyebrow="FAQ" title="Perguntas frequentes" />
        <div className="mx-auto max-w-3xl divide-y divide-mkt-card-border rounded-lg border border-mkt-card-border bg-card">
          {[
            {
              q: 'Posso testar grátis?',
              a: 'Sim. O plano Solo é grátis para sempre, com até 5 alunos. Sem cartão.',
            },
            {
              q: 'Meu aluno também precisa pagar?',
              a: 'Não. O acesso do aluno via app é incluído em qualquer plano.',
            },
            {
              q: 'Funciona offline?',
              a: 'O app do aluno tem cache local — ele consegue ver o treino e registrar séries mesmo sem internet.',
            },
            {
              q: 'Como migro de planilhas?',
              a: 'Importe seus alunos via CSV. Treinos novos você monta direto no editor.',
            },
          ].map((item) => (
            <details key={item.q} className="group p-6 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer items-center justify-between gap-4 font-display font-semibold">
                {item.q}
                <span className="text-2xl text-muted-foreground transition group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
            </details>
          ))}
        </div>
      </Section>

      <section className="bg-mkt-hero py-24 text-center text-mkt-on-dark">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-6">
          <Rocket className="size-10" />
          <h2 className="font-display text-4xl font-bold tracking-tight lg:text-hero-h2">
            Pronto para crescer sem virar planilha?
          </h2>
          <p className="text-lg text-mkt-on-dark/85">
            Começa em menos de 2 minutos. Sem cartão de crédito.
          </p>
          <Button asChild variant="cta" size="xl">
            <Link href="/signup" className="gap-2">
              Criar conta grátis <ArrowRight />
            </Link>
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function Navbar() {
  return (
    <nav className="border-b border-white/10">
      <div className="mx-auto flex max-w-container items-center justify-between px-6 py-5 lg:px-20">
        <Logo variant="on-dark" size="md" />
        <div className="hidden items-center gap-8 lg:flex">
          {NAV_LINKS.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              className="text-sm font-medium text-mkt-on-dark/85 hover:text-mkt-on-dark"
            >
              {label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="border-white/25 bg-white/5 text-mkt-on-dark hover:bg-white/15"
          >
            <Link href="/login">Entrar</Link>
          </Button>
          <Button asChild variant="cta" size="sm">
            <Link href="/signup">Começar grátis</Link>
          </Button>
        </div>
      </div>
    </nav>
  );
}

function HeroPreview() {
  return (
    <div className="relative hidden lg:block">
      <div className="rounded-lg border border-white/15 bg-card p-6 shadow-elevated">
        <div className="flex items-center justify-between">
          <span className="font-display text-sm font-bold text-foreground">Treino A · Hoje</span>
          <span className="rounded-pill bg-success-bg px-3 py-1 font-display text-[10px] font-semibold uppercase tracking-[0.08em] text-[#1B7A3D]">
            Em andamento
          </span>
        </div>
        <ul className="mt-4 flex flex-col gap-3 text-sm text-foreground">
          {[
            ['Supino reto', '4 × 10 · 60kg'],
            ['Crucifixo', '3 × 12 · 14kg'],
            ['Tríceps polia', '4 × 12 · 30kg'],
            ['Elevação lateral', '3 × 15 · 8kg'],
          ].map(([name, sets]) => (
            <li
              key={name}
              className="flex items-center justify-between border-b border-border pb-3 last:border-b-0"
            >
              <span className="font-display font-semibold">{name}</span>
              <span className="text-xs text-muted-foreground">{sets}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex items-center gap-2 rounded-md bg-success-bg p-3 text-sm text-[#1B7A3D]">
          <CheckCircle2 className="size-4" />
          <span>3 alunos completaram o treino hoje</span>
        </div>
      </div>
    </div>
  );
}

function Section({
  bg,
  id,
  children,
}: {
  bg: 'dark' | 'light';
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className={`${bg === 'dark' ? 'bg-mkt-dark text-mkt-on-dark' : 'bg-mkt-light'} py-24 lg:py-32`}
    >
      <div className="mx-auto flex max-w-container flex-col gap-12 px-6 lg:px-20">{children}</div>
    </section>
  );
}

function SectionHead({
  eyebrow,
  title,
  subtitle,
  dark,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  dark?: boolean;
}) {
  return (
    <header className="flex max-w-3xl flex-col gap-4">
      <span className="font-display text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
        {eyebrow}
      </span>
      <h2
        className={`font-display text-3xl font-bold leading-tight tracking-tight lg:text-hero-h2 ${dark ? 'text-mkt-on-dark' : 'text-foreground'}`}
      >
        {title}
      </h2>
      {subtitle && (
        <p
          className={`text-base leading-relaxed ${dark ? 'text-mkt-on-dark-muted' : 'text-muted-foreground'}`}
        >
          {subtitle}
        </p>
      )}
    </header>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof Users;
  title: string;
  body: string;
}) {
  return (
    <article className="flex flex-col gap-4 rounded-lg border border-mkt-card-border bg-card p-6 shadow-card">
      <span className="grid size-12 place-items-center rounded-md bg-success-bg text-primary">
        <Icon className="size-6" />
      </span>
      <h3 className="font-display text-lg font-bold">{title}</h3>
      <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
    </article>
  );
}

function PriceCard({
  name,
  price,
  unit,
  tagline,
  features,
  highlight,
}: {
  name: string;
  price: string;
  unit?: string;
  tagline: string;
  features: string[];
  highlight?: boolean;
}) {
  return (
    <article
      className={`flex flex-col gap-6 rounded-lg p-8 ${highlight ? 'border-2 border-primary bg-card shadow-elevated' : 'border border-mkt-card-border bg-card shadow-card'}`}
    >
      <div className="flex items-center justify-between">
        <h3 className="font-display text-xl font-bold">{name}</h3>
        {highlight && (
          <span className="rounded-pill bg-success-bg px-3 py-1 font-display text-[10px] font-semibold uppercase tracking-[0.08em] text-[#1B7A3D]">
            Popular
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="font-display text-4xl font-bold">{price}</span>
        {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
      </div>
      <p className="text-sm text-muted-foreground">{tagline}</p>
      <ul className="flex flex-col gap-2 text-sm">
        {features.map((f) => (
          <li key={f} className="flex items-center gap-2">
            <CheckCircle2 className="size-4 text-primary" />
            {f}
          </li>
        ))}
      </ul>
      <Button asChild variant={highlight ? 'default' : 'secondary'} className="mt-2">
        <Link href="/signup">Começar agora</Link>
      </Button>
    </article>
  );
}

function Footer() {
  return (
    <footer className="bg-mkt-dark py-16 text-mkt-on-dark-muted">
      <div className="mx-auto flex max-w-container flex-col gap-12 px-6 lg:px-20">
        <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div className="flex flex-col gap-3">
            <Logo variant="on-dark" size="md" />
            <p className="max-w-sm text-sm">
              A plataforma de treinos para personal trainers e alunos independentes.
            </p>
          </div>
          <FooterCol
            title="Produto"
            links={[
              ['Funcionalidades', '#features'],
              ['Planos', '#pricing'],
              ['FAQ', '#faq'],
            ]}
          />
          <FooterCol
            title="Empresa"
            links={[
              ['Sobre', '#'],
              ['Blog', '#'],
              ['Contato', 'mailto:hi@muvit.app'],
            ]}
          />
          <FooterCol
            title="Legal"
            links={[
              ['Termos', '#'],
              ['Privacidade', '#'],
            ]}
          />
        </div>
        <div className="flex items-center justify-between border-t border-white/10 pt-6 text-xs">
          <span>© 2026 Muvit. Todos os direitos reservados.</span>
          <span>Feito no Brasil 🇧🇷</span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div className="flex flex-col gap-3">
      <span className="font-display text-[11px] font-semibold uppercase tracking-[0.08em] text-mkt-on-dark">
        {title}
      </span>
      <ul className="flex flex-col gap-2 text-sm">
        {links.map(([label, href]) => (
          <li key={href}>
            <Link href={href} className="hover:text-mkt-on-dark">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Li({ children }: { children: React.ReactNode }) {
  return (
    <li className="inline-flex items-center gap-2">
      <CheckCircle2 className="size-4 text-primary" /> {children}
    </li>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-sm">
      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
      <span>{children}</span>
    </li>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="font-display text-3xl font-bold text-foreground">{value}</span>
      <span className="text-xs uppercase tracking-[0.08em] text-muted-foreground">{label}</span>
    </div>
  );
}
