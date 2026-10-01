export function SearchForm({ initialQuery = "", course = "", book = "", placeholder = "搜索知识点、课程或教材" }: { initialQuery?: string; course?: string; book?: string; placeholder?: string }) {
  return <form className="search-form" action="/search" method="get"><input name="q" defaultValue={initialQuery} placeholder={placeholder} aria-label="搜索知识点、课程或教材" maxLength={100} />{course && <input type="hidden" name="course" value={course} />}{book && <input type="hidden" name="book" value={book} />}<button type="submit" aria-label="搜索">⌕</button></form>;
}
