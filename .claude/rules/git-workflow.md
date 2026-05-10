---
name: Git Workflow Rules
description: Regras obrigatórias de fluxo git para todas as modificações de código
type: feedback
---

# Regras de Git Workflow

## Antes de qualquer modificação de código

Execute SEMPRE estes passos na ordem, sem exceção:

```powershell
# 1. Verificar branch atual
git branch --show-current

# 2. Verificar alterações pendentes
git status

# 3. Atualizar a branch atual ANTES de criar nova branch
git pull

# 4. Criar e entrar na nova branch
git checkout -b <tipo>/<nome-descritivo>
```

**Confirme com o usuário em qual branch as alterações serão feitas antes de começar.**

## Regra crítica

É **PROIBIDO** criar uma nova branch a partir de código desatualizado.  
**Why:** Evita conflitos desnecessários e garante que o trabalho parte do estado mais recente do repositório.  
**How to apply:** O `git pull` deve sempre preceder o `git checkout -b`.

## Tipos de branch aceitos

| Prefixo | Quando usar |
|---|---|
| `feature/` | Nova funcionalidade |
| `fix/` | Correção de bug |
| `refactor/` | Reorganização sem mudança de comportamento |
| `chore/` | Tarefas de manutenção, configuração, docs |

## O que NUNCA fazer

- **Nunca** modificar arquivos diretamente na branch `main`, `master` ou `develop`
- **Nunca** fazer `git push` sem permissão explícita do usuário

## Ao concluir a tarefa

Informe ao usuário:

1. **Branch criada:** `<tipo>/<nome>`
2. **Resumo das alterações** feitas
3. **Sugestão de commit** no padrão Conventional Commits:

```
<tipo>(escopo): descrição curta em português
```

Exemplos:
```
feat(produtos): adicionar coluna de margem de lucro na tabela
fix(auth): corrigir validação de UUID nos DTOs de produto
chore(git): adicionar regras de workflow para branches
refactor(ingredientes): extrair lógica de custo para hook separado
```

## Auto-aprendizado

Quando identificar um padrão repetido ou uma decisão importante durante o desenvolvimento, salve em `.claude/rules/` no arquivo mais relevante.

Quando o usuário disser **"lembra disso"** ou **"adiciona como regra"**, atualize o arquivo correto imediatamente — sem esperar ser perguntado de novo.
