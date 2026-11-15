export const DESK_CATEGORIES=[
 {id:'monthly',slug:'monthly-hall-of-shame',name:'Monthly Hall of Shame',byline:'A month of records. The details behind the points.',summary:'Explore the previous month\'s highest official routine-inspection point totals, with dates and later context.'},
 {id:'red',slug:'red-violation-report',name:'Red Violation Report',byline:'Critical findings, with history in view.',summary:'Follow critical-finding counts across comparable routine inspections, including improvements.'},
 {id:'repeats',slug:'repeated-violations',name:'Repeat Offenders',byline:'The patterns behind the inspection record.',summary:'Follow consecutive routine-inspection streaks for each recurring official violation code.'},
 {id:'closures',slug:'closed-kitchen-watch',name:'Closed Kitchen Watch',byline:'Dated closure records. Context comes first.',summary:'Read historical closure findings and check the authority\'s current closure and reopening notices.'},
 {id:'violations',slug:'most-violations',name:'Most Violations',byline:'The count behind the inspection.',summary:'Browse the previous month\'s recorded violation counts, separate from weighted points.'},
 {id:'comebacks',slug:'recent-comebacks',name:'Recent Comebacks',byline:'Progress, measured across routine inspections.',summary:'Meet up to ten businesses with the largest point reductions on their newest routine inspection within 30 days.'},
 {id:'clean',slug:'clean-plate-award',name:'Clean Plate Award',byline:'Consistency across the inspection history.',summary:'Recognize zero-point streaks and consistent low points across the full saved routine history.'},
];
export const findDeskCategory=slug=>DESK_CATEGORIES.find(category=>category.slug===slug);
