// Community Features JavaScript
class CommunityManager {
  constructor() {
    this.currentUserId = null;
    this.currentTab = 'forum';
    this.init();
  }

  async init() {
    // Get current user from Clerk
    await this.getCurrentUser();
    
    // Setup tab switching
    this.setupTabs();
    
    // Setup modals
    this.setupModals();
    
    // Load initial content
    this.loadTabContent(this.currentTab);
  }

  async getCurrentUser() {
    try {
      if (window.Clerk) {
        const clerk = window.Clerk;
        if (clerk.user) {
          this.currentUserId = clerk.user.id;
        } else {
          // Wait for Clerk to be ready
          clerk.load().then(() => {
            if (clerk.user) {
              this.currentUserId = clerk.user.id;
            }
          });
        }
      }
    } catch (e) {
      console.log('User not authenticated');
    }
  }

  setupTabs() {
    const tabs = document.querySelectorAll('.community-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const tabName = tab.getAttribute('data-tab');
        this.switchTab(tabName);
      });
    });
  }

  switchTab(tabName) {
    // Update active tab
    document.querySelectorAll('.community-tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Update active content
    document.querySelectorAll('.community-tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById(`${tabName}-tab`).classList.add('active');
    
    this.currentTab = tabName;
    this.loadTabContent(tabName);
  }

  async loadTabContent(tabName) {
    switch(tabName) {
      case 'forum':
        await this.loadForumPosts();
        break;
      case 'qa':
        await this.loadQuestions();
        break;
      case 'stories':
        await this.loadSuccessStories();
        break;
      case 'groups':
        await this.loadRegionalGroups();
        break;
      case 'knowledge':
        await this.loadKnowledgeArticles();
        break;
    }
  }

  async loadForumPosts(category = '', search = '') {
    const container = document.getElementById('forum-posts');
    container.innerHTML = '<div class="loading-spinner">Loading posts...</div>';
    
    try {
      const params = new URLSearchParams();
      if (category) params.append('category', category);
      if (search) params.append('search', search);
      
      const response = await fetch(`/api/community/posts?${params}`);
      const data = await response.json();
      
      if (data.posts && data.posts.length > 0) {
        container.innerHTML = data.posts.map(post => this.renderPost(post)).join('');
      } else {
        container.innerHTML = '<div class="empty-state">No posts found. Be the first to post!</div>';
      }
    } catch (error) {
      container.innerHTML = '<div class="error-state">Failed to load posts. Please try again.</div>';
      console.error('Error loading posts:', error);
    }
  }

  renderPost(post) {
    const tags = post.tags.length > 0 ? post.tags.map(t => `<span class="tag">${t}</span>`).join('') : '';
    return `
      <div class="community-card" onclick="communityManager.viewPost(${post.id})">
        <div class="card-header">
          <div class="author-info">
            <div class="author-avatar">${post.author.charAt(0).toUpperCase()}</div>
            <div>
              <div class="author-name">${post.author}</div>
              <div class="post-date">${this.formatDate(post.created_at)}</div>
            </div>
          </div>
          <span class="category-badge">${post.category}</span>
        </div>
        <h3 class="card-title">${post.title}</h3>
        <p class="card-content">${post.content}</p>
        ${tags ? `<div class="card-tags">${tags}</div>` : ''}
        <div class="card-footer">
          <div class="card-stats">
            <span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg> ${post.views}</span>
            <span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg> ${post.likes}</span>
            <span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg> ${post.comments_count}</span>
          </div>
        </div>
      </div>
    `;
  }

  async loadQuestions(category = '', answered = '') {
    const container = document.getElementById('qa-questions');
    container.innerHTML = '<div class="loading-spinner">Loading questions...</div>';
    
    try {
      const params = new URLSearchParams();
      if (category) params.append('category', category);
      if (answered !== '') params.append('answered', answered);
      
      const response = await fetch(`/api/community/questions?${params}`);
      const data = await response.json();
      
      if (data.questions && data.questions.length > 0) {
        container.innerHTML = data.questions.map(q => this.renderQuestion(q)).join('');
      } else {
        container.innerHTML = '<div class="empty-state">No questions found. Ask the first question!</div>';
      }
    } catch (error) {
      container.innerHTML = '<div class="error-state">Failed to load questions. Please try again.</div>';
      console.error('Error loading questions:', error);
    }
  }

  renderQuestion(question) {
    const tags = question.tags.length > 0 ? question.tags.map(t => `<span class="tag">${t}</span>`).join('') : '';
    const answeredBadge = question.is_answered ? '<span class="answered-badge">✓ Answered</span>' : '<span class="unanswered-badge">? Unanswered</span>';
    
    return `
      <div class="community-card" onclick="communityManager.viewQuestion(${question.id})">
        <div class="card-header">
          <div class="author-info">
            <div class="author-avatar">${question.author.charAt(0).toUpperCase()}</div>
            <div>
              <div class="author-name">${question.author}</div>
              <div class="post-date">${this.formatDate(question.created_at)}</div>
            </div>
          </div>
          ${answeredBadge}
        </div>
        <h3 class="card-title">${question.title}</h3>
        <p class="card-content">${question.content}</p>
        ${tags ? `<div class="card-tags">${tags}</div>` : ''}
        <div class="card-footer">
          <div class="card-stats">
            <span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg> ${question.views}</span>
            <span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg> ${question.answers_count} answers</span>
          </div>
        </div>
      </div>
    `;
  }

  async loadSuccessStories(region = '', cropType = '') {
    const container = document.getElementById('success-stories');
    container.innerHTML = '<div class="loading-spinner">Loading stories...</div>';
    
    try {
      const params = new URLSearchParams();
      if (region) params.append('region', region);
      if (cropType) params.append('crop_type', cropType);
      
      const response = await fetch(`/api/community/success-stories?${params}`);
      const data = await response.json();
      
      if (data.stories && data.stories.length > 0) {
        container.innerHTML = data.stories.map(s => this.renderStory(s)).join('');
      } else {
        container.innerHTML = '<div class="empty-state">No success stories yet. Share yours!</div>';
      }
    } catch (error) {
      container.innerHTML = '<div class="error-state">Failed to load stories. Please try again.</div>';
      console.error('Error loading stories:', error);
    }
  }

  renderStory(story) {
    const yieldBadge = story.yield_increase ? `<span class="yield-badge">+${story.yield_increase}% Yield</span>` : '';
    
    return `
      <div class="story-card" onclick="communityManager.viewStory(${story.id})">
        ${story.image_url ? `<img src="${story.image_url}" alt="${story.title}" class="story-image">` : ''}
        <div class="story-content">
          <div class="story-header">
            <span class="story-region">${story.region}</span>
            <span class="story-crop">${story.crop_type}</span>
            ${yieldBadge}
          </div>
          <h3 class="story-title">${story.title}</h3>
          <p class="story-text">${story.content}</p>
          <div class="story-footer">
            <div class="author-info">
              <div class="author-avatar">${story.author.charAt(0).toUpperCase()}</div>
              <span>${story.author}</span>
            </div>
            <div class="story-stats">
              <span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg> ${story.likes}</span>
              <span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg> ${story.views}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  async loadRegionalGroups() {
    const container = document.getElementById('regional-groups');
    container.innerHTML = '<div class="loading-spinner">Loading groups...</div>';
    
    try {
      const response = await fetch('/api/community/groups');
      const data = await response.json();
      
      if (data.groups && data.groups.length > 0) {
        container.innerHTML = data.groups.map(g => this.renderGroup(g)).join('');
      } else {
        container.innerHTML = '<div class="empty-state">No regional groups available yet.</div>';
      }
    } catch (error) {
      container.innerHTML = '<div class="error-state">Failed to load groups. Please try again.</div>';
      console.error('Error loading groups:', error);
    }
  }

  renderGroup(group) {
    return `
      <div class="group-card">
        <div class="group-header">
          <h3 class="group-name">${group.name}</h3>
          <span class="group-region">${group.region}</span>
        </div>
        <p class="group-description">${group.description || 'Join this regional group to connect with local farmers.'}</p>
        <div class="group-footer">
          <div class="group-stats">
            <span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg> ${group.member_count} members</span>
            <span>${group.language || 'Multi-language'}</span>
          </div>
          <button class="btn-join-group" onclick="communityManager.joinGroup(${group.id})">Join Group</button>
        </div>
      </div>
    `;
  }

  async loadKnowledgeArticles(category = '', search = '') {
    const container = document.getElementById('knowledge-articles');
    container.innerHTML = '<div class="loading-spinner">Loading articles...</div>';
    
    try {
      const params = new URLSearchParams();
      if (category) params.append('category', category);
      if (search) params.append('search', search);
      
      const response = await fetch(`/api/community/knowledge?${params}`);
      const data = await response.json();
      
      if (data.articles && data.articles.length > 0) {
        container.innerHTML = data.articles.map(a => this.renderArticle(a)).join('');
      } else {
        container.innerHTML = '<div class="empty-state">No articles found. Create the first one!</div>';
      }
    } catch (error) {
      container.innerHTML = '<div class="error-state">Failed to load articles. Please try again.</div>';
      console.error('Error loading articles:', error);
    }
  }

  renderArticle(article) {
    const tags = article.tags.length > 0 ? article.tags.map(t => `<span class="tag">${t}</span>`).join('') : '';
    const featuredBadge = article.is_featured ? '<span class="featured-badge">⭐ Featured</span>' : '';
    
    return `
      <div class="community-card" onclick="communityManager.viewArticle(${article.id})">
        <div class="card-header">
          <div class="author-info">
            <div class="author-avatar">${article.author.charAt(0).toUpperCase()}</div>
            <div>
              <div class="author-name">${article.author}</div>
              <div class="post-date">${this.formatDate(article.created_at)}</div>
            </div>
          </div>
          ${featuredBadge}
        </div>
        <h3 class="card-title">${article.title}</h3>
        <p class="card-content">${article.content}</p>
        ${tags ? `<div class="card-tags">${tags}</div>` : ''}
        <div class="card-footer">
          <span class="category-badge">${article.category}</span>
          <div class="card-stats">
            <span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg> ${article.views}</span>
            <span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg> ${article.likes}</span>
          </div>
        </div>
      </div>
    `;
  }

  setupModals() {
    // Setup filter listeners
    document.getElementById('forum-category-filter')?.addEventListener('change', (e) => {
      const search = document.getElementById('forum-search').value;
      this.loadForumPosts(e.target.value, search);
    });
    
    document.getElementById('forum-search')?.addEventListener('input', (e) => {
      const category = document.getElementById('forum-category-filter').value;
      this.loadForumPosts(category, e.target.value);
    });
    
    document.getElementById('qa-category-filter')?.addEventListener('change', (e) => {
      const status = document.getElementById('qa-status-filter').value;
      this.loadQuestions(e.target.value, status);
    });
    
    document.getElementById('qa-status-filter')?.addEventListener('change', (e) => {
      const category = document.getElementById('qa-category-filter').value;
      this.loadQuestions(category, e.target.value);
    });
    
    // Setup create buttons
    document.getElementById('create-post-btn')?.addEventListener('click', () => this.showCreatePostModal());
    document.getElementById('ask-question-btn')?.addEventListener('click', () => this.showAskQuestionModal());
    document.getElementById('share-story-btn')?.addEventListener('click', () => this.showShareStoryModal());
    document.getElementById('create-article-btn')?.addEventListener('click', () => this.showCreateArticleModal());
  }

  showCreatePostModal() {
    if (!this.currentUserId) {
      alert('Please sign in to create a post');
      return;
    }
    // Simple prompt for now - can be enhanced with a proper modal
    const title = prompt('Post Title:');
    if (!title) return;
    const content = prompt('Post Content:');
    if (!content) return;
    this.createPost({ title, content, category: 'general' });
  }

  async createPost(data) {
    try {
      const response = await fetch('/api/community/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await response.json();
      if (result.id) {
        alert('Post created successfully!');
        this.loadForumPosts();
      }
    } catch (error) {
      console.error('Error creating post:', error);
      alert('Failed to create post');
    }
  }

  async joinGroup(groupId) {
    if (!this.currentUserId) {
      alert('Please sign in to join a group');
      return;
    }
    try {
      const response = await fetch(`/api/community/groups/${groupId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const result = await response.json();
      alert(result.message || 'Joined group successfully!');
      this.loadRegionalGroups();
    } catch (error) {
      console.error('Error joining group:', error);
      alert('Failed to join group');
    }
  }

  viewPost(postId) {
    // Navigate to post detail view
    console.log('View post:', postId);
  }

  viewQuestion(questionId) {
    console.log('View question:', questionId);
  }

  viewStory(storyId) {
    console.log('View story:', storyId);
  }

  viewArticle(articleId) {
    console.log('View article:', articleId);
  }

  formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  }
}

// Initialize community manager
let communityManager;
document.addEventListener('DOMContentLoaded', () => {
  communityManager = new CommunityManager();
});

