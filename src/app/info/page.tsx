import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = {
  title: "À propos des données — EauxVid",
  description:
    "Sources de données et méthodologie du tableau de bord EauxVid",
};

export default function InfoPage() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Retour au tableau de bord
        </Link>
        <h1 className="mt-3 text-2xl font-bold">À propos des données</h1>
        <p className="mt-2 text-muted-foreground">
          Ce tableau de bord agrège plusieurs sources de données publiques pour
          le suivi épidémiologique en France. Voici le détail de chaque source.
        </p>
      </div>

      {/* Eaux usées */}
      <Card>
        <CardHeader>
          <CardTitle>Eaux usées — Réseau SUM&apos;Eau</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm leading-relaxed">
          <p>
            Le réseau{" "}
            <strong>
              SUM&apos;Eau (Surveillance Microbiologique des Eaux usées)
            </strong>{" "}
            est un dispositif piloté par Santé publique France en collaboration
            avec les laboratoires d&apos;analyse des eaux usées. Il mesure la{" "}
            <strong>concentration en génome viral du SARS-CoV-2</strong> dans les
            eaux usées en entrée de stations d&apos;épuration.
          </p>
          <p>
            Les prélèvements sont réalisés de manière <strong>hebdomadaire</strong>.
            La concentration est exprimée en{" "}
            <strong>nombre de copies de génome par litre</strong> (copies/L).
            L&apos;indicateur affiché est un indicateur de tendance dérivé de ces
            mesures, classifié en niveaux de sévérité (faible, modéré, élevé,
            très élevé, extrêmement élevé).
          </p>
          <p>
            Ce suivi permet de détecter la circulation virale indépendamment du
            recours aux soins et du dépistage individuel, offrant un signal
            complémentaire aux indicateurs cliniques.
          </p>
          <p>
            <a
              href="https://www.data.gouv.fr/fr/datasets/surveillance-du-sars-cov-2-dans-les-eaux-usees-sumeau/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline hover:no-underline"
            >
              Source : data.gouv.fr — Jeu de données SUM&apos;Eau
            </a>
          </p>
        </CardContent>
      </Card>

      {/* Passages aux urgences */}
      <Card>
        <CardHeader>
          <CardTitle>Passages aux urgences — SurSaUD / Odissé</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm leading-relaxed">
          <p>
            Les données de <strong>passages aux urgences</strong> proviennent du
            système de surveillance syndromique{" "}
            <strong>SurSaUD (Surveillance sanitaire des Urgences et des Décès)</strong>,
            accessible via la plateforme <strong>Odissé</strong> de Santé
            publique France.
          </p>
          <p>
            L&apos;indicateur affiché est le{" "}
            <strong>taux de passages aux urgences pour 10 000 passages</strong>{" "}
            toutes causes, pour les pathologies suivantes :
          </p>
          <ul className="list-disc pl-5">
            <li>
              <strong>Grippe</strong> (syndromes grippaux)
            </li>
            <li>
              <strong>Bronchiolite</strong> (chez les nourrissons)
            </li>
            <li>
              <strong>COVID-19</strong> (suspicions et diagnostics confirmés)
            </li>
          </ul>
          <p>
            Les données sont disponibles à <strong>fréquence hebdomadaire</strong>,
            avec une granularité nationale et départementale. Elles permettent de
            suivre l&apos;impact des épidémies respiratoires sur le système de
            soins d&apos;urgence.
          </p>
          <p>
            <a
              href="https://odisse.santepubliquefrance.fr/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline hover:no-underline"
            >
              Source : Odissé — Santé publique France
            </a>
          </p>
        </CardContent>
      </Card>

      {/* Rougeole */}
      <Card>
        <CardHeader>
          <CardTitle>
            Rougeole — Déclarations obligatoires
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm leading-relaxed">
          <p>
            La <strong>rougeole</strong> est une maladie à{" "}
            <strong>déclaration obligatoire (DO)</strong> en France. Chaque cas
            diagnostiqué doit être signalé aux autorités sanitaires. Les données
            affichées ici proviennent du système de déclaration obligatoire,
            accessibles via la plateforme <strong>Odissé</strong>.
          </p>
          <p>
            L&apos;indicateur principal est le{" "}
            <strong>
              taux de notification pour 100 000 habitants
            </strong>{" "}
            (<em>tx</em>), qui rapporte le nombre de cas déclarés à la population
            du département ou de la France entière. Cet indicateur est disponible
            à <strong>fréquence annuelle</strong>, de <strong>2005 à 2023</strong>.
          </p>
          <p>
            <strong>Attention :</strong> la déclaration obligatoire ne capture pas
            l&apos;intégralité des cas. Selon une estimation de 2013, le taux
            d&apos;exhaustivité de la DO rougeole est d&apos;environ{" "}
            <strong>56 %</strong>. Les chiffres affichés sous-estiment donc la
            circulation réelle du virus.
          </p>
          <p>
            Les données couvrent l&apos;ensemble des départements français
            (métropole et outre-mer) et sont agrégées tous âges confondus.
          </p>
          <p>
            <a
              href="https://odisse.santepubliquefrance.fr/explore/dataset/rougeole-donnees-declaration-obligatoire/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline hover:no-underline"
            >
              Source : Odissé — Rougeole, données de déclaration obligatoire
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
