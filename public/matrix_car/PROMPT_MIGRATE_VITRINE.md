# Prompt — migrar vitrine matrix → jogo

Cola isto num agente. Não improvisar pastas.

```
Lê e segue à letra.

Contrato
- Fonte (NÃO MEXER, NÃO MOVER, NÃO RESIZE, NÃO FLIP):
  public/matrix_car/$N_hero/car_$N_hero.png
- Destino (cópia byte-a-byte):
  public/assets/cars/car_$N_hero.png
- $N é o número do carro. car-1 e car_1 são o mesmo: N=1.
- car-6-tank → N=6 → car_6_hero.png
- delorean não tem N — ignora.
- Não toques em a000…a029, strips, tar.gz, gabarito, nem no hero dentro de matrix_car.

Código
- src/data/cars/CarManifest.ts → portraitCandidateUrls / matrixHeroUrl
- Primeiro URL do still da garagem passa a:
  assets/cars/car_$N_hero.png
- matrix_car/... deixa de ser o primeiro hit. Pode ficar como fallback no fim, ou sair.
- Teste: portraitCandidateUrls('car-1')[0] === 'assets/cars/car_1_hero.png'
  e o mesmo para 'car_1'.
- Não mudes GarageLayout nem a pose do para-brisas.

Passos
1. Lista public/matrix_car/*_hero/car_*_hero.png. Copia cada um para
   public/assets/cars/car_$N_hero.png. Se o destino já existir e for
   diferente, NÃO sobrescrevas — reporta e pára nesse N.
2. Actualiza o primeiro caminho em portraitCandidateUrls.
3. Corre: npx vitest run tests/data/CarManifest.test.ts && npx tsc --noEmit
4. Reporta: quantos N copiaste, quais faltavam, o primeiro URL de car-1.

Não corras strip, gen:sprites, nem commit.
```
