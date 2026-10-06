/* ============================================================
   Ecosystem Scouting, form schema
   Everything about WHAT is asked lives here: steps, questions,
   options, branching (showIf) and early exits.
   The engine (form-engine.js) only knows how to render this.

   Question types: text | textarea | url | email | number | select |
                   radio (cards) | checkbox (chips) | consent
   Common fields: id, label, help, required, placeholder, maxLength,
                  showIf(answers) -> boolean, options[], optionsFrom(answers)
   Checkbox options can set exclusive:true (e.g. "None of these").
   ============================================================ */
(function () {

  var INDUSTRIES = [
    { value: 'pharma_lifesciences', label: 'Pharma & life sciences' },
    { value: 'manufacturing', label: 'Manufacturing & industrial' },
    { value: 'automotive', label: 'Automotive & mobility' },
    { value: 'financial_services', label: 'Banking, insurance & financial services' },
    { value: 'retail_cpg', label: 'Retail & consumer goods' },
    { value: 'energy_utilities', label: 'Energy & utilities' },
    { value: 'public_sector', label: 'Public sector & healthcare providers' },
    { value: 'telco_media', label: 'Telco, media & tech' },
    { value: 'logistics', label: 'Transport & logistics' },
    { value: 'cross_industry', label: 'Cross-industry' }
  ];

  var COUNTRIES = [
    'Italy', 'Austria', 'Belgium', 'Bulgaria', 'Croatia', 'Cyprus', 'Czech Republic', 'Denmark', 'Estonia', 'Finland',
    'France', 'Germany', 'Greece', 'Hungary', 'Iceland', 'Ireland', 'Latvia', 'Lithuania', 'Luxembourg', 'Malta',
    'Netherlands', 'Norway', 'Poland', 'Portugal', 'Romania', 'Serbia', 'Slovakia', 'Slovenia', 'Spain', 'Sweden',
    'Switzerland', 'Turkey', 'Ukraine', 'United Kingdom',
    'United States', 'Canada', 'Mexico', 'Brazil', 'Argentina', 'Chile', 'Colombia',
    'Israel', 'United Arab Emirates', 'Saudi Arabia', 'Qatar', 'Egypt', 'South Africa', 'Nigeria', 'Kenya',
    'India', 'Singapore', 'Japan', 'South Korea', 'China', 'Hong Kong', 'Taiwan', 'Australia', 'New Zealand', 'Indonesia', 'Vietnam',
    'Other'
  ].map(function (c) { return { value: c, label: c }; });

  var DOMAINS = [
    { value: 'data_platforms', label: 'Data platforms & storage', help: 'Lakehouse, warehouse, databases, table formats, query engines' },
    { value: 'integration', label: 'Data integration, pipelines & streaming', help: 'Connectors, CDC, ELT, orchestration, event streaming' },
    { value: 'semantic_kg', label: 'Semantic layer, knowledge graphs & ontologies', help: 'RDF/OWL, property graphs, metrics layers, data virtualization' },
    { value: 'governance', label: 'Data governance, catalog, quality & observability', help: 'Metadata, lineage, quality rules, policies, master data' },
    { value: 'security', label: 'Data security, privacy & access control', help: 'Masking, tokenization, RBAC/ABAC, encryption, consent' },
    { value: 'analytics', label: 'Analytics, BI & metrics', help: 'Dashboards, self-service, embedded and natural-language analytics' },
    { value: 'ml_platform', label: 'AI/ML platforms, MLOps & feature stores', help: 'Training, serving, registry, monitoring, GPU management' },
    { value: 'genai', label: 'Generative AI, LLM infrastructure & agents', help: 'RAG, agent frameworks, gateways, evals, guardrails, inference' },
    { value: 'ai_governance', label: 'AI governance, evaluation & monitoring', help: 'Inventory, risk, compliance (EU AI Act), audit, control' },
    { value: 'vertical_ai', label: 'Industry-specific AI application', help: 'An AI product built for one industry, with data infrastructure underneath' },
    { value: 'other_data_ai', label: 'Other data or AI software', help: 'Tell us more in the next question' },
    { value: 'none', label: 'None of these', exclusive: true }
  ];

  var DOMAIN_LABELS = {};
  DOMAINS.forEach(function (d) { DOMAIN_LABELS[d.value] = d.label; });

  function has(answers, id, value) {
    var v = answers[id];
    return Array.isArray(v) ? v.indexOf(value) !== -1 : v === value;
  }
  function isPrimary(value) {
    return function (a) { return a.primary_domain === value; };
  }

  window.SCOUTING_SCHEMA = {
    meta: { industries: INDUSTRIES, domains: DOMAINS, domainLabels: DOMAIN_LABELS },

    /* Early exits. Keys referenced by step.exit(). */
    exits: {
      out_of_scope_offer: {
        title: 'Thanks for your interest, this program is for software products',
        text: 'Ecosystem Scouting is dedicated to software vendors building data and AI products. Services, consulting and hardware companies are outside its scope, so we will not ask you to complete the form.',
        hint: 'If you think your company is a software vendor after all, you can start over and choose a different answer.'
      },
      out_of_scope_domain: {
        title: 'Thanks for your interest, your product sits outside our scope',
        text: 'Our practice focuses on data and AI software: data platforms, integration, semantic layers and knowledge graphs, governance, security, analytics, ML and generative AI infrastructure, and AI governance. We only review products in these areas.',
        hint: 'If any of those areas describes your product, you can start over and select it.'
      }
    },

    steps: [

      /* ------------------------------------------------------------ */
      {
        id: 'scope',
        title: 'Scope',
        heading: 'First, is this the right program for you?',
        intro: 'Two quick questions. If your company is outside our scope we tell you right away, so you do not spend time on the rest.',
        questions: [
          {
            id: 'offer_type', type: 'radio', required: true,
            label: 'What best describes what you offer?',
            options: [
              { value: 'product', label: 'A software product', help: 'SaaS, on-premises or hybrid, sold under a licence or subscription' },
              { value: 'opensource', label: 'An open source project with a commercial offering', help: 'Enterprise edition, managed service or support around an OSS core' },
              { value: 'services', label: 'Data or AI services and consulting', help: 'You sell people and projects, not a product' },
              { value: 'hardware', label: 'Hardware, devices or infrastructure equipment' },
              { value: 'other', label: 'Something else' }
            ]
          },
          {
            id: 'domains', type: 'checkbox', required: true,
            label: 'Which areas describe your product?',
            help: 'Select all that apply.',
            options: DOMAINS,
            showIf: function (a) { return a.offer_type === 'product' || a.offer_type === 'opensource'; }
          },
          {
            id: 'primary_domain', type: 'radio', required: true, alwaysReview: true,
            label: 'Which one is the primary area?',
            help: 'The rest of the form adapts to this answer.',
            optionsFrom: function (a) {
              return DOMAINS.filter(function (d) { return d.value !== 'none' && has(a, 'domains', d.value); })
                .map(function (d) { return { value: d.value, label: d.label }; });
            },
            showIf: function (a) {
              var d = a.domains || [];
              return (a.offer_type === 'product' || a.offer_type === 'opensource') && d.length > 1 && d.indexOf('none') === -1;
            }
          },
          {
            id: 'other_domain_text', type: 'text', required: true, maxLength: 160,
            label: 'In a few words, what kind of data or AI software is it?',
            showIf: function (a) { return has(a, 'domains', 'other_data_ai'); }
          }
        ],
        /* Called after validation. Return an exit key to stop the form. */
        exit: function (a) {
          if (['services', 'hardware', 'other'].indexOf(a.offer_type) !== -1) return 'out_of_scope_offer';
          var d = a.domains || [];
          if (d.length === 1 && d[0] === 'none') return 'out_of_scope_domain';
          return null;
        },
        /* Called after validation to normalise answers. */
        after: function (a) {
          var d = (a.domains || []).filter(function (v) { return v !== 'none'; });
          if (d.length === 1) a.primary_domain = d[0];
          if (d.length > 1 && d.indexOf(a.primary_domain) === -1) delete a.primary_domain;
        }
      },

      /* ------------------------------------------------------------ */
      {
        id: 'company',
        title: 'Company',
        heading: 'About your company',
        intro: 'The basics we need to place you on the map.',
        questions: [
          { id: 'company_name', type: 'text', required: true, label: 'Company name', maxLength: 120 },
          { id: 'website', type: 'url', required: true, label: 'Website', placeholder: 'https://' },
          { id: 'hq_country', type: 'select', required: true, label: 'Headquarters country', options: COUNTRIES },
          { id: 'founded_year', type: 'number', required: true, label: 'Year founded', min: 1980, max: new Date().getFullYear(), placeholder: 'YYYY' },
          {
            id: 'company_size', type: 'radio', required: true, label: 'Team size',
            options: [
              { value: '1-10', label: '1 to 10' }, { value: '11-50', label: '11 to 50' }, { value: '51-200', label: '51 to 200' },
              { value: '201-1000', label: '201 to 1,000' }, { value: '1000+', label: 'More than 1,000' }
            ]
          },
          {
            id: 'funding_stage', type: 'select', required: true, label: 'Funding stage',
            options: [
              { value: 'bootstrapped', label: 'Bootstrapped / self-funded' },
              { value: 'pre_seed', label: 'Pre-seed' },
              { value: 'seed', label: 'Seed' },
              { value: 'series_a', label: 'Series A' },
              { value: 'series_b', label: 'Series B' },
              { value: 'series_c_plus', label: 'Series C or later' },
              { value: 'corporate', label: 'Corporate-backed or public company' },
              { value: 'grant', label: 'Grant-funded or academic' }
            ]
          },
          {
            id: 'funding_total', type: 'select', required: false, label: 'Total funding raised',
            help: 'Optional. Any currency, rough bands are fine.',
            options: [
              { value: 'undisclosed', label: 'Prefer not to say' },
              { value: 'lt_1m', label: 'Under 1 million' },
              { value: '1_5m', label: '1 to 5 million' },
              { value: '5_20m', label: '5 to 20 million' },
              { value: '20_50m', label: '20 to 50 million' },
              { value: '50m_plus', label: 'More than 50 million' }
            ]
          },
          {
            id: 'spinout', type: 'radio', required: true, label: 'Is the company a university or research spinout?',
            options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }]
          },
          { id: 'spinout_institution', type: 'text', required: true, label: 'Which institution?', maxLength: 120, showIf: function (a) { return a.spinout === 'yes'; } },
          {
            id: 'regions', type: 'checkbox', required: true, label: 'Where do you sell today?',
            options: [
              { value: 'italy', label: 'Italy' }, { value: 'europe', label: 'Rest of Europe' }, { value: 'north_america', label: 'North America' },
              { value: 'latam', label: 'Latin America' }, { value: 'mea', label: 'Middle East & Africa' }, { value: 'apac', label: 'Asia Pacific' }
            ]
          },
          {
            id: 'europe_presence', type: 'radio', required: true, label: 'Do you have people on the ground in Europe?',
            options: [
              { value: 'italy', label: 'Yes, including Italy' },
              { value: 'europe', label: 'Yes, elsewhere in Europe' },
              { value: 'none', label: 'Not yet' }
            ]
          }
        ]
      },

      /* ------------------------------------------------------------ */
      {
        id: 'product',
        title: 'Product',
        heading: 'About the product',
        intro: 'What it does, how it is delivered, how it connects. A few questions are specific to your primary area.',
        questions: [
          { id: 'product_name', type: 'text', required: true, label: 'Product name', maxLength: 120 },
          { id: 'tagline', type: 'text', required: true, label: 'In one line, what does it do?', maxLength: 140, placeholder: 'e.g. A knowledge graph platform that unifies enterprise data for AI applications' },
          { id: 'problem', type: 'textarea', required: true, label: 'What problem do you solve, and for whom?', maxLength: 800, help: 'Who is the buyer, who is the user, and what changes for them.' },
          { id: 'differentiator', type: 'textarea', required: true, label: 'What makes it different from the alternatives?', maxLength: 800 },
          { id: 'competitors', type: 'text', required: false, label: 'Who do you usually get compared to?', maxLength: 200, help: 'Two or three names are enough.' },
          {
            id: 'deployment', type: 'checkbox', required: true, label: 'Deployment options',
            options: [
              { value: 'saas', label: 'SaaS, multi-tenant' },
              { value: 'single_tenant', label: 'Dedicated cloud instance' },
              { value: 'byoc', label: "In the customer's cloud account (BYOC)" },
              { value: 'onprem', label: 'On-premises' },
              { value: 'airgapped', label: 'Air-gapped' },
              { value: 'hybrid', label: 'Hybrid' }
            ]
          },
          {
            id: 'marketplaces', type: 'checkbox', required: false, label: 'Available on cloud marketplaces?',
            options: [
              { value: 'aws', label: 'AWS Marketplace' }, { value: 'azure', label: 'Azure Marketplace' }, { value: 'gcp', label: 'Google Cloud Marketplace' },
              { value: 'databricks', label: 'Databricks Partner Connect' }, { value: 'snowflake', label: 'Snowflake Marketplace' },
              { value: 'none', label: 'Not yet', exclusive: true }
            ]
          },
          {
            id: 'licensing', type: 'checkbox', required: true, label: 'Licensing model',
            options: [
              { value: 'subscription', label: 'Subscription' }, { value: 'consumption', label: 'Consumption-based' }, { value: 'perpetual', label: 'Perpetual licence' },
              { value: 'open_core', label: 'Open core' }, { value: 'oss_support', label: 'Open source + paid support' }, { value: 'free_tier', label: 'Free tier available' }
            ]
          },
          {
            id: 'oss_core', type: 'radio', required: true, label: 'Is the core of the product open source?',
            options: [{ value: 'yes', label: 'Yes' }, { value: 'partly', label: 'Partly' }, { value: 'no', label: 'No' }]
          },
          {
            id: 'oss_license', type: 'select', required: true, label: 'Open source licence',
            options: [
              { value: 'apache2', label: 'Apache 2.0' }, { value: 'mit_bsd', label: 'MIT / BSD' }, { value: 'gpl_agpl', label: 'GPL / AGPL' },
              { value: 'source_available', label: 'Source-available (BSL, SSPL, ELv2)' }, { value: 'other', label: 'Other' }
            ],
            showIf: function (a) { return a.oss_core === 'yes' || a.oss_core === 'partly'; }
          },
          {
            id: 'apis', type: 'checkbox', required: true, label: 'How do customers integrate with it?',
            options: [
              { value: 'rest', label: 'REST API' }, { value: 'graphql', label: 'GraphQL' }, { value: 'grpc', label: 'gRPC' },
              { value: 'sdk_python', label: 'Python SDK' }, { value: 'sdk_java', label: 'Java / JVM SDK' }, { value: 'sdk_js', label: 'JavaScript SDK' },
              { value: 'cli', label: 'CLI' }, { value: 'terraform', label: 'Terraform / IaC' }, { value: 'sql', label: 'SQL interface' },
              { value: 'none', label: 'No public API yet', exclusive: true }
            ]
          },

          /* ----- Branch: semantic layer / knowledge graph ----- */
          {
            id: 'kg_standards', type: 'checkbox', required: true, label: 'Which standards and models do you support?', showIf: isPrimary('semantic_kg'),
            options: [
              { value: 'rdf_owl_sparql', label: 'RDF / OWL / SPARQL' }, { value: 'shacl', label: 'SHACL' }, { value: 'property_graph', label: 'Property graph (Cypher, GQL, Gremlin)' },
              { value: 'r2rml_virtualization', label: 'R2RML / virtual graphs over relational sources' }, { value: 'sql_metrics', label: 'SQL metrics layer' },
              { value: 'dbt_metricflow', label: 'dbt Semantic Layer / MetricFlow' }, { value: 'graphql_schema', label: 'GraphQL schema layer' }, { value: 'other', label: 'Other' }
            ]
          },
          {
            id: 'kg_approach', type: 'radio', required: true, label: 'How does data get into the graph or semantic layer?', showIf: isPrimary('semantic_kg'),
            options: [
              { value: 'virtualization', label: 'Virtualization: data stays at the source' },
              { value: 'materialization', label: 'Materialization: data is loaded into our store' },
              { value: 'both', label: 'Both' }
            ]
          },
          {
            id: 'kg_scale', type: 'select', required: true, label: 'Largest production deployment', showIf: isPrimary('semantic_kg'),
            options: [
              { value: 'lt_10m', label: 'Under 10 million triples / nodes' }, { value: '10_100m', label: '10 to 100 million' },
              { value: '100m_1b', label: '100 million to 1 billion' }, { value: '1b_plus', label: 'More than 1 billion' }, { value: 'na', label: 'Not applicable' }
            ]
          },
          {
            id: 'kg_llm', type: 'checkbox', required: true, label: 'LLM-related capabilities', showIf: isPrimary('semantic_kg'),
            options: [
              { value: 'graphrag', label: 'GraphRAG / grounding for LLMs' }, { value: 'nl_query', label: 'Natural language to SPARQL / SQL / Cypher' },
              { value: 'ontology_gen', label: 'AI-assisted ontology or mapping generation' }, { value: 'mcp', label: 'MCP server or agent tools' }, { value: 'none', label: 'None yet', exclusive: true }
            ]
          },

          /* ----- Branch: data platforms ----- */
          {
            id: 'dp_formats', type: 'checkbox', required: true, label: 'Storage and table formats', showIf: isPrimary('data_platforms'),
            options: [
              { value: 'iceberg', label: 'Apache Iceberg' }, { value: 'delta', label: 'Delta Lake' }, { value: 'hudi', label: 'Apache Hudi' },
              { value: 'parquet', label: 'Parquet / ORC' }, { value: 'proprietary', label: 'Proprietary format' }, { value: 'other', label: 'Other' }
            ]
          },
          {
            id: 'dp_engines', type: 'checkbox', required: true, label: 'Query and compute engines', showIf: isPrimary('data_platforms'),
            options: [
              { value: 'spark', label: 'Spark' }, { value: 'trino', label: 'Trino / Presto' }, { value: 'duckdb', label: 'DuckDB' }, { value: 'flink', label: 'Flink' },
              { value: 'clickhouse', label: 'ClickHouse' }, { value: 'own', label: 'Our own engine' }, { value: 'other', label: 'Other' }
            ]
          },
          {
            id: 'dp_workloads', type: 'checkbox', required: true, label: 'Workloads supported', showIf: isPrimary('data_platforms'),
            options: [
              { value: 'batch', label: 'Batch' }, { value: 'streaming', label: 'Streaming' }, { value: 'interactive', label: 'Interactive SQL' },
              { value: 'ml', label: 'ML training / inference' }, { value: 'vector', label: 'Vector search' }, { value: 'transactional', label: 'Transactional' }
            ]
          },

          /* ----- Branch: integration ----- */
          {
            id: 'int_capabilities', type: 'checkbox', required: true, label: 'Capabilities', showIf: isPrimary('integration'),
            options: [
              { value: 'cdc', label: 'Change data capture' }, { value: 'streaming', label: 'Event streaming' }, { value: 'batch_elt', label: 'Batch ELT' },
              { value: 'transformation', label: 'Transformations (SQL, dbt)' }, { value: 'reverse_etl', label: 'Reverse ETL' }, { value: 'orchestration', label: 'Orchestration' },
              { value: 'api_integration', label: 'API / application integration' }, { value: 'unstructured', label: 'Unstructured data ingestion' }
            ]
          },
          {
            id: 'int_connectors', type: 'select', required: true, label: 'Number of connectors', showIf: isPrimary('integration'),
            options: [
              { value: 'lt_50', label: 'Under 50' }, { value: '50_200', label: '50 to 200' }, { value: '200_plus', label: 'More than 200' }, { value: 'custom', label: 'Custom per customer' }
            ]
          },
          {
            id: 'int_streaming', type: 'checkbox', required: false, label: 'Streaming platforms supported', showIf: isPrimary('integration'),
            options: [
              { value: 'kafka', label: 'Kafka / Confluent' }, { value: 'pulsar', label: 'Pulsar' }, { value: 'kinesis', label: 'Kinesis' },
              { value: 'eventhubs', label: 'Azure Event Hubs' }, { value: 'pubsub', label: 'Google Pub/Sub' }, { value: 'none', label: 'None', exclusive: true }
            ]
          },

          /* ----- Branch: governance ----- */
          {
            id: 'gov_capabilities', type: 'checkbox', required: true, label: 'Capabilities', showIf: isPrimary('governance'),
            options: [
              { value: 'catalog', label: 'Data catalog' }, { value: 'lineage', label: 'Lineage' }, { value: 'quality', label: 'Data quality rules' },
              { value: 'observability', label: 'Data observability' }, { value: 'policy', label: 'Policy management' }, { value: 'mdm', label: 'Master data management' },
              { value: 'privacy_ops', label: 'Privacy operations' }, { value: 'contracts', label: 'Data contracts / products' }
            ]
          },
          {
            id: 'gov_integrations', type: 'checkbox', required: true, label: 'Integrations with governance and platform tools', showIf: isPrimary('governance'),
            options: [
              { value: 'purview', label: 'Microsoft Purview' }, { value: 'collibra', label: 'Collibra' }, { value: 'alation', label: 'Alation' },
              { value: 'unity', label: 'Databricks Unity Catalog' }, { value: 'snowflake_horizon', label: 'Snowflake Horizon' }, { value: 'datahub', label: 'DataHub / OpenMetadata' },
              { value: 'openlineage', label: 'OpenLineage' }, { value: 'none', label: 'None yet', exclusive: true }
            ]
          },
          {
            id: 'gov_regulations', type: 'checkbox', required: true, label: 'Regulations you help with', showIf: isPrimary('governance'),
            options: [
              { value: 'gdpr', label: 'GDPR' }, { value: 'eu_ai_act', label: 'EU AI Act' }, { value: 'dora', label: 'DORA' }, { value: 'data_act', label: 'EU Data Act' },
              { value: 'hipaa', label: 'HIPAA' }, { value: 'sox', label: 'SOX' }, { value: 'none', label: 'Not regulation-specific', exclusive: true }
            ]
          },

          /* ----- Branch: security ----- */
          {
            id: 'sec_capabilities', type: 'checkbox', required: true, label: 'Capabilities', showIf: isPrimary('security'),
            options: [
              { value: 'rbac_abac', label: 'Fine-grained access control (RBAC / ABAC)' }, { value: 'masking', label: 'Dynamic masking' }, { value: 'tokenization', label: 'Tokenization / pseudonymisation' },
              { value: 'encryption', label: 'Encryption / key management' }, { value: 'discovery', label: 'Sensitive data discovery' }, { value: 'dlp', label: 'DLP' },
              { value: 'consent', label: 'Consent management' }, { value: 'synthetic', label: 'Synthetic data' }
            ]
          },
          {
            id: 'sec_enforcement', type: 'radio', required: true, label: 'How are policies enforced?', showIf: isPrimary('security'),
            options: [
              { value: 'native', label: 'Pushed down as native policies in the data platforms' },
              { value: 'proxy', label: 'Through a proxy or gateway in the query path' },
              { value: 'agent', label: 'Through agents installed on the systems' },
              { value: 'other', label: 'Other' }
            ]
          },

          /* ----- Branch: analytics ----- */
          {
            id: 'ana_capabilities', type: 'checkbox', required: true, label: 'Capabilities', showIf: isPrimary('analytics'),
            options: [
              { value: 'dashboards', label: 'Dashboards & reporting' }, { value: 'self_service', label: 'Self-service exploration' }, { value: 'metrics_layer', label: 'Metrics / semantic layer' },
              { value: 'embedded', label: 'Embedded analytics' }, { value: 'nl_query', label: 'Natural language querying' }, { value: 'notebooks', label: 'Notebooks / code-first' },
              { value: 'planning', label: 'Planning & forecasting' }
            ]
          },
          {
            id: 'ana_sources', type: 'checkbox', required: true, label: 'Data sources supported', showIf: isPrimary('analytics'),
            options: [
              { value: 'snowflake', label: 'Snowflake' }, { value: 'databricks', label: 'Databricks' }, { value: 'bigquery', label: 'BigQuery' },
              { value: 'fabric', label: 'Microsoft Fabric / Synapse' }, { value: 'redshift', label: 'Redshift' }, { value: 'postgres', label: 'PostgreSQL / MySQL' },
              { value: 'files', label: 'Files & APIs' }, { value: 'other', label: 'Other' }
            ]
          },

          /* ----- Branch: ML platform ----- */
          {
            id: 'ml_capabilities', type: 'checkbox', required: true, label: 'Capabilities', showIf: isPrimary('ml_platform'),
            options: [
              { value: 'training', label: 'Training & experiment tracking' }, { value: 'serving', label: 'Model serving' }, { value: 'feature_store', label: 'Feature store' },
              { value: 'registry', label: 'Model registry' }, { value: 'monitoring', label: 'Model monitoring' }, { value: 'gpu', label: 'GPU / compute management' },
              { value: 'automl', label: 'AutoML' }, { value: 'labeling', label: 'Data labeling' }
            ]
          },
          {
            id: 'ml_frameworks', type: 'checkbox', required: true, label: 'Frameworks and ecosystems', showIf: isPrimary('ml_platform'),
            options: [
              { value: 'pytorch', label: 'PyTorch' }, { value: 'tensorflow', label: 'TensorFlow' }, { value: 'sklearn', label: 'scikit-learn / XGBoost' },
              { value: 'huggingface', label: 'Hugging Face' }, { value: 'mlflow', label: 'MLflow' }, { value: 'kubeflow', label: 'Kubeflow / Kubernetes' },
              { value: 'databricks_ml', label: 'Databricks ML' }, { value: 'sagemaker_azureml', label: 'SageMaker / Azure ML / Vertex' }
            ]
          },

          /* ----- Branch: generative AI ----- */
          {
            id: 'gen_capabilities', type: 'checkbox', required: true, label: 'Capabilities', showIf: isPrimary('genai'),
            options: [
              { value: 'rag', label: 'RAG / retrieval' }, { value: 'agents', label: 'Agent building & orchestration' }, { value: 'gateway', label: 'LLM gateway / routing' },
              { value: 'evals', label: 'Evaluation & testing' }, { value: 'guardrails', label: 'Guardrails & safety' }, { value: 'fine_tuning', label: 'Fine-tuning' },
              { value: 'inference', label: 'Inference hosting' }, { value: 'vector_db', label: 'Vector database' }, { value: 'observability', label: 'LLM observability' },
              { value: 'document_ai', label: 'Document intelligence' }
            ]
          },
          {
            id: 'gen_models', type: 'checkbox', required: true, label: 'Model providers supported', showIf: isPrimary('genai'),
            options: [
              { value: 'openai_azure', label: 'OpenAI / Azure OpenAI' }, { value: 'anthropic', label: 'Anthropic' }, { value: 'google', label: 'Google Gemini' },
              { value: 'bedrock', label: 'AWS Bedrock' }, { value: 'open_weights', label: 'Open-weight models (Llama, Mistral, Qwen)' }, { value: 'own', label: 'Our own models' }
            ]
          },
          {
            id: 'gen_protocols', type: 'checkbox', required: true, label: 'Protocols and frameworks', showIf: isPrimary('genai'),
            options: [
              { value: 'mcp', label: 'MCP (Model Context Protocol)' }, { value: 'a2a', label: 'A2A' }, { value: 'openai_compat', label: 'OpenAI-compatible API' },
              { value: 'langchain', label: 'LangChain / LlamaIndex' }, { value: 'none', label: 'None of these', exclusive: true }
            ]
          },

          /* ----- Branch: AI governance ----- */
          {
            id: 'aig_capabilities', type: 'checkbox', required: true, label: 'Capabilities', showIf: isPrimary('ai_governance'),
            options: [
              { value: 'inventory', label: 'AI system inventory' }, { value: 'risk', label: 'Risk assessment & classification' }, { value: 'monitoring', label: 'Runtime monitoring' },
              { value: 'policy', label: 'Policy & approval workflows' }, { value: 'gateway', label: 'Control gateway / action control' }, { value: 'audit', label: 'Audit trail & reporting' },
              { value: 'eu_ai_act', label: 'EU AI Act mapping' }, { value: 'bias', label: 'Bias & fairness testing' }
            ]
          },
          {
            id: 'aig_scope', type: 'radio', required: true, label: 'Which AI systems does it cover?', showIf: isPrimary('ai_governance'),
            options: [
              { value: 'all', label: 'All AI systems, classic ML and generative' }, { value: 'genai', label: 'Generative AI and agents only' }, { value: 'ml', label: 'Classic ML only' }
            ]
          },

          /* ----- Branch: vertical AI ----- */
          {
            id: 'vert_industry', type: 'checkbox', required: true, label: 'Which industry is it built for?', showIf: isPrimary('vertical_ai'), options: INDUSTRIES
          },
          {
            id: 'vert_stack', type: 'textarea', required: true, maxLength: 600, showIf: isPrimary('vertical_ai'),
            label: 'What data and AI infrastructure sits underneath, and is it reusable across use cases?',
            help: 'We integrate platforms, so we want to understand the layer below the application.'
          }
        ]
      },

      /* ------------------------------------------------------------ */
      {
        id: 'readiness',
        title: 'Readiness',
        heading: 'Traction and enterprise readiness',
        intro: 'Where you are today. Early is fine: we scout early. We just need an honest picture.',
        questions: [
          {
            id: 'customers', type: 'radio', required: true, label: 'Paying customers',
            options: [
              { value: '0', label: 'None yet' }, { value: '1-5', label: '1 to 5' }, { value: '6-20', label: '6 to 20' }, { value: '21-100', label: '21 to 100' }, { value: '100+', label: 'More than 100' }
            ]
          },
          {
            id: 'enterprise_share', type: 'radio', required: true, label: 'How many of them are large enterprises?',
            help: 'Organisations with more than 1,000 employees.',
            options: [{ value: 'none', label: 'None' }, { value: 'some', label: 'Some' }, { value: 'most', label: 'Most' }],
            showIf: function (a) { return a.customers && a.customers !== '0'; }
          },
          { id: 'references', type: 'text', required: false, maxLength: 240, label: 'Reference customers you can name', help: 'Optional. "Under NDA" is a valid answer.', showIf: function (a) { return a.customers && a.customers !== '0'; } },
          { id: 'industries', type: 'checkbox', required: true, label: 'Industries you serve', options: INDUSTRIES },
          {
            id: 'acv', type: 'select', required: false, label: 'Typical annual contract value',
            help: 'Optional. Any currency.',
            options: [
              { value: 'undisclosed', label: 'Prefer not to say' }, { value: 'lt_25k', label: 'Under 25k' }, { value: '25_100k', label: '25k to 100k' },
              { value: '100_500k', label: '100k to 500k' }, { value: '500k_plus', label: 'More than 500k' }
            ]
          },
          {
            id: 'time_to_value', type: 'select', required: true, label: 'Typical time from contract to production',
            options: [
              { value: 'days', label: 'Days' }, { value: 'weeks', label: 'A few weeks' }, { value: '1_3_months', label: '1 to 3 months' }, { value: '3_plus_months', label: 'More than 3 months' }
            ]
          },
          {
            id: 'certifications', type: 'checkbox', required: true, label: 'Security and compliance certifications',
            options: [
              { value: 'soc2', label: 'SOC 2' }, { value: 'iso27001', label: 'ISO 27001' }, { value: 'iso42001', label: 'ISO 42001 (AI management)' },
              { value: 'hipaa', label: 'HIPAA' }, { value: 'gdpr_dpa', label: 'GDPR-ready DPA' }, { value: 'in_progress', label: 'In progress' },
              { value: 'none', label: 'None yet', exclusive: true }
            ]
          },
          {
            id: 'enterprise_features', type: 'checkbox', required: true, label: 'Enterprise features',
            options: [
              { value: 'sso', label: 'SSO (SAML / OIDC)' }, { value: 'rbac', label: 'Role-based access control' }, { value: 'audit', label: 'Audit logs' },
              { value: 'eu_residency', label: 'EU data residency' }, { value: 'private_networking', label: 'Private networking (VPC / Private Link)' },
              { value: 'sla', label: 'Contractual SLA' }, { value: 'support_247', label: '24/7 support' }, { value: 'none', label: 'None yet', exclusive: true }
            ]
          },
          {
            id: 'trial', type: 'radio', required: true, label: 'How can our architects try the product?',
            options: [
              { value: 'sandbox', label: 'Self-service trial or sandbox' }, { value: 'guided', label: 'Guided proof of concept with your team' }, { value: 'none', label: 'Not available yet' }
            ]
          },
          {
            id: 'poc_willing', type: 'radio', required: true, label: 'Would you run a proof of concept with Accenture?',
            options: [
              { value: 'yes_free', label: 'Yes, at no cost' }, { value: 'yes_paid', label: 'Yes, as a paid engagement' }, { value: 'not_now', label: 'Not at this stage' }
            ]
          },
          {
            id: 'partners', type: 'radio', required: true, label: 'Do you already work with system integrators or consultancies?',
            options: [
              { value: 'yes_si', label: 'Yes, with system integrators' }, { value: 'cloud_only', label: 'Only with cloud or platform vendors' }, { value: 'none', label: 'Not yet' }
            ]
          },
          { id: 'partner_names', type: 'text', required: false, maxLength: 200, label: 'Which ones?', showIf: function (a) { return a.partners === 'yes_si' || a.partners === 'cloud_only'; } },
          {
            id: 'partner_program', type: 'checkbox', required: true, label: 'Partner program in place',
            options: [
              { value: 'reseller', label: 'Reseller agreement' }, { value: 'referral', label: 'Referral fees' }, { value: 'cosell', label: 'Co-sell motion' },
              { value: 'enablement', label: 'Partner training & certification' }, { value: 'none', label: 'None yet', exclusive: true }
            ]
          },
          {
            id: 'looking_for', type: 'checkbox', required: true, label: 'What would you want from a relationship with Accenture?',
            options: [
              { value: 'co_delivery', label: 'Co-delivery on client programs' }, { value: 'resale', label: 'Resale' }, { value: 'referral', label: 'Referral' },
              { value: 'joint_gtm', label: 'Joint go-to-market' }, { value: 'reference_architecture', label: 'Inclusion in reference architectures' },
              { value: 'enablement', label: 'Practice enablement and training' }, { value: 'feedback', label: 'Product feedback from the field' }
            ]
          }
        ]
      },

      /* ------------------------------------------------------------ */
      {
        id: 'contact',
        title: 'Contact',
        heading: 'How we reach you',
        intro: 'One contact person. We use these details only to follow up on this submission.',
        questions: [
          { id: 'contact_name', type: 'text', required: true, label: 'Full name', maxLength: 120, autocomplete: 'name' },
          { id: 'contact_role', type: 'text', required: true, label: 'Role', maxLength: 120, placeholder: 'e.g. CEO, Head of Partnerships, Founder', autocomplete: 'organization-title' },
          { id: 'contact_email', type: 'email', required: true, label: 'Work e-mail', autocomplete: 'email', help: 'We reply here. Please use your company address.' },
          { id: 'contact_phone', type: 'text', required: false, label: 'Phone', maxLength: 40, autocomplete: 'tel' },
          { id: 'linkedin', type: 'url', required: false, label: 'LinkedIn profile', placeholder: 'https://linkedin.com/in/' },
          { id: 'materials_url', type: 'url', required: false, label: 'Link to deck, demo or documentation', help: 'Optional. A shared folder or a public page. The form cannot take attachments.' },
          {
            id: 'heard_from', type: 'select', required: true, label: 'How did you hear about this program?',
            options: [
              { value: 'accenture_contact', label: 'An Accenture contact' }, { value: 'event', label: 'An event or conference' }, { value: 'linkedin', label: 'LinkedIn' },
              { value: 'search', label: 'Web search' }, { value: 'partner', label: 'A partner or investor' }, { value: 'other', label: 'Other' }
            ]
          },
          { id: 'notes', type: 'textarea', required: false, maxLength: 800, label: 'Anything else we should know?', help: 'Optional. Upcoming releases, a client you want to work on together, constraints.' },
          {
            id: 'consent', type: 'consent', required: true,
            label: 'I have read the <a href="../legal.html#privacy" target="_blank" rel="noopener">privacy notice</a> and agree that Accenture processes the information in this form to evaluate my company for the Ecosystem Scouting program.'
          },
          {
            id: 'updates_optin', type: 'consent', required: false,
            label: 'Keep me informed about future scouting programs and events of the Advanced Data Architecture practice.'
          }
        ]
      }
    ]
  };
})();
