export type Recipe = {
  id: string;
  cookbookId?: string;
  title: string;
  imageUrl: string;
  sourceLabel: string;
  sourceUrl: string;
  metadata: string;
  ingredients: string[];
  directions: string[];
  notes: string[];
  nutrition: string[];
  tags: string[];
  favorite: boolean;
  createdAt: string;
  updatedAt: string;
};

export type RecipeDraft = Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'> & {
  id?: string;
};

export type RecipeFilters = {
  query: string;
  tags: string[];
  favoritesOnly: boolean;
};

export type SyncState = 'idle' | 'syncing' | 'offline' | 'error' | 'success';

export type HouseholdRole = 'owner' | 'editor';

export type Cookbook = {
  id: string;
  name: string;
  inviteCode?: string;
  role: HouseholdRole;
};
