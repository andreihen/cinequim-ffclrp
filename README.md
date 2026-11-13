# CineLab

Laboratório Interativo de Cinética Química. Aplicação estática em React e TypeScript. Os cálculos, as fórmulas em KaTeX e os gráficos em Recharts são processados no navegador.

## Executar no computador

Instale Node.js 20.18+ ou 22 LTS. Na pasta do projeto, execute:

~~~sh
npm ci
npm run dev
~~~

Abra o endereço exibido pelo Vite. Para ver a versão de produção localmente, execute:

~~~sh
npm run build
npm run preview
~~~

A prévia de produção usa o caminho /cinelab/. Para testar em um telefone na mesma rede, inicie o Vite com `npm run dev -- --host` e use no telefone o endereço de rede exibido.

## Módulos

| Módulo | Cálculo |
| --- | --- |
| Lei de velocidade | Calcula v com ordens fornecidas ou recupera k de uma velocidade observada. A unidade de k segue a ordem global. |
| Dados experimentais | Estima ordens reais e k de medidas de velocidade inicial. O ajuste usa mínimos quadrados de ln v em função de ln das concentrações, com decomposição QR. |
| Mecanismos reacionais | Simula concentrações por ação das massas a partir das constantes elementares fornecidas. Aceita até 12 espécies e 24 etapas reversíveis ou irreversíveis. |
| Leis integradas | Calcula concentração e meia-vida para ordens zero, primeira e segunda, usando a lei diferencial para uma única espécie. |
| Equação de Arrhenius | Prevê k em uma temperatura ou ajusta ln k em função de 1/T para obter Ea e A. |

A biblioteca traz exemplos carregáveis, incluindo etapas consecutivas e equilíbrio reversível. Cada cálculo mostra a equação, o passo a passo e os resultados com unidades. Digite números com vírgula ou ponto decimal. A notação científica, como 1e-6, também é aceita.

### Convenções e limites científicos

- As concentrações são expressas em mol/L, os tempos em segundos e as velocidades em mol/L/s. Em Arrhenius, informe Ea em kJ/mol e use uma unidade consistente para todas as medidas de k e para A. O cálculo converte as temperaturas para kelvin.
- Para estimar n ordens e k, informe pelo menos n + 1 ensaios com concentrações positivas e independentes entre si. O ajuste de Arrhenius exige duas temperaturas distintas ou mais. Use ensaios adicionais para avaliar os resíduos. O R² é calculado em escala logarítmica.
- Cadastre cada espécie do mecanismo e escreva as etapas no formato 2 A + B. Separe os termos com espaços ao redor do sinal de adição. Use 0 para representar uma fonte ou sumidouro. A estequiometria é fornecida pelo usuário.
- A simulação adota ação das massas em concentração, com sistema bem misturado, volume fixo e constantes invariáveis durante a execução. Dormand–Prince 5(4) controla o erro local com tolerâncias relativa e absoluta, reduz o passo diante de concentrações negativas relevantes e limita cada simulação a 15.000 tentativas. O método é explícito e pode atingir o limite em problemas rígidos.
- O ajuste experimental determina parâmetros da lei de velocidade global. As constantes de cada etapa elementar são entradas do simulador. Os testes comparam a integração com as soluções analíticas dos mecanismos consecutivo, reversível e de segunda ordem.

### Armazenamento e relatórios

O histórico registra cálculos concluídos. O botão **Salvar** guarda os parâmetros para uso posterior, inclusive rascunhos. Os registros são mantidos por navegador e origem, com até 50 itens em cada lista. **Exportar JSON** gera um arquivo de parâmetros com versão de formato para reabrir com **Importar**. Depois de calcular, use **Exportar CSV** para obter os dados numéricos ou **Imprimir relatório** para imprimir ou salvar em PDF pelo navegador.

## Testes

~~~sh
npm test
npx playwright install chromium
npm run build
npm run test:e2e
~~~

O Playwright verifica a versão de produção em Chromium nos perfis de desktop e smartphone. Em uma máquina com Chrome instalado, a variável `CINELAB_BROWSER_CHANNEL=chrome` seleciona esse navegador. Para incluir Firefox, WebKit com perfil de iPhone e Microsoft Edge, instale o Edge e execute `npx playwright install firefox webkit` antes de rodar os testes com `CINELAB_CROSS_BROWSER=1`.

## Publicar no GitHub Pages

1. Crie um repositório no GitHub, por exemplo cinelab. Use um repositório vazio se for enviar este projeto como primeiro commit.
2. Inicialize o Git e envie os arquivos para a branch main. Substitua USUARIO pelo proprietário do repositório.

   ~~~sh
   git init -b main
   git add .
   git commit -m "Implementa o CineLab"
   git remote add origin https://github.com/USUARIO/cinelab.git
   git push -u origin main
   ~~~

3. No repositório, abra **Settings → Pages** e selecione **GitHub Actions** como origem da publicação.
4. Na aba **Actions**, execute **Testar e publicar no GitHub Pages** pela opção **Run workflow**. Os próximos pushes para main disparam o mesmo fluxo.
5. Ao concluir, abra a URL exibida em **Settings → Pages**, por exemplo `https://USUARIO.github.io/cinelab/`.

O workflow usa o caminho retornado pela configuração do Pages, inclusive para repositórios com outro nome. A navegação usa fragmentos da URL, o que permite abrir os módulos diretamente no GitHub Pages. Consulte a [documentação de publicação estática do Vite](https://vite.dev/guide/static-deploy.html#github-pages).
