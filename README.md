# Kashier Cases prototype

A clickable HTML prototype of the **Cases** module of the Kashier agent portal: Underwriting reviews the applications Sales submits.

**Open it:** https://ayamuhammed11.github.io/kashier-cases-prototype/

## What it covers

- **One case per channel.** A submitted application opens one case for all its Online services and one for all its POS services.
- **Round-robin assignment.** Each case is assigned to the next Underwriting Agent the moment it opens. Only the Underwriting Manager reassigns cases and filters by agent; an agent sees only their own cases.
- **Review per service.** Each service is reviewed on its own: its pricing and approved rates, its PF contract (a PF service can't be approved without it), and every document the document rules require for that service. Each item is approved or rejected with a reason.
- **One decision per document.** A document several services require is approved or rejected once for all of them.
- **Statuses.** A case is *New* until it is decided. *Approve case* once every item is approved. *Return to Sales* once every item is reviewed and at least one is rejected: it needs feedback, sends every rejected item with its reason, and the case stays dimmed and view only until Sales resubmits it.
- Merchant details, channel setup (websites, POS terminals and store image), payout methods in full, an activity log, and a bulk download of the case documents.

Use **View as** in the top bar to switch between the agents (Rana, Omar, Salma) and the manager (Layla). **Reset data** puts the sample cases back. All data is fictitious and kept in your browser only.

## Files

- `cases/index.html`: the Cases list (queue)
- `cases/case.html`: one case
- `cases/shared/`: the Cases data, rules and list
- `sales-applications/shared/`, `components/`, `img/`: the shared agent-portal shell, styles and filter bar the pages load
