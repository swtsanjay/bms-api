<?php
/** Adminer - Compact database management
* @link https://www.adminer.org/
* @author Jakub Vrana, https://www.vrana.cz/
* @copyright 2007 Jakub Vrana
* @license https://www.apache.org/licenses/LICENSE-2.0 Apache License, Version 2.0
* @license https://www.gnu.org/licenses/gpl-2.0.html GNU General Public License, version 2 (one or other)
* @version 4.16.0
*/$ia="4.16.0";function
adminer_errors($Ec,$Gc){return!!preg_match('~^(Trying to access array offset on( value of type)? null|Undefined (array key|property))~',$Gc);}error_reporting(6135);set_error_handler('adminer_errors',E_WARNING);$ad=!preg_match('~^(unsafe_raw)?$~',ini_get("filter.default"));if($ad||ini_get("filter.default_flags")){foreach(array('_GET','_POST','_COOKIE','_SERVER')as$X){$_i=filter_input_array(constant("INPUT$X"),FILTER_UNSAFE_RAW);if($_i)$$X=$_i;}}if(function_exists("mb_internal_encoding"))mb_internal_encoding("8bit");function
connection(){global$f;return$f;}function
adminer(){global$b;return$b;}function
version(){global$ia;return$ia;}function
idf_unescape($t){if(!preg_match('~^[`\'"[]~',$t))return$t;$me=substr($t,-1);return
str_replace($me.$me,$me,substr($t,1,-1));}function
escape_string($X){return
substr(q($X),1,-1);}function
number($X){return
preg_replace('~[^0-9]+~','',$X);}function
number_type(){return'((?<!o)int(?!er)|numeric|real|float|double|decimal|money)';}function
remove_slashes($lg,$ad=false){if(function_exists("get_magic_quotes_gpc")&&get_magic_quotes_gpc()){while(list($x,$X)=each($lg)){foreach($X
as$ee=>$W){unset($lg[$x][$ee]);if(is_array($W)){$lg[$x][stripslashes($ee)]=$W;$lg[]=&$lg[$x][stripslashes($ee)];}else$lg[$x][stripslashes($ee)]=($ad?$W:stripslashes($W));}}}}function
bracket_escape($t,$Ma=false){static$ki=array(':'=>':1',']'=>':2','['=>':3','"'=>':4');return
strtr($t,($Ma?array_flip($ki):$ki));}function
min_version($Ri,$ze="",$g=null){global$f;if(!$g)$g=$f;$eh=$g->server_info;if($ze&&preg_match('~([\d.]+)-MariaDB~',$eh,$A)){$eh=$A[1];$Ri=$ze;}return$Ri&&version_compare($eh,$Ri)>=0;}function
charset($f){return(min_version("5.5.3",0,$f)?"utf8mb4":"utf8");}function
script($ph,$ji="\n"){return"<script".nonce().">$ph</script>$ji";}function
script_src($Ei){return"<script src='".h($Ei)."'".nonce()."></script>\n";}function
nonce(){return' nonce="'.get_nonce().'"';}function
target_blank(){return' target="_blank" rel="noreferrer noopener"';}function
h($P){return
str_replace("\0","&#0;",htmlspecialchars($P,ENT_QUOTES,'utf-8'));}function
nl_br($P){return
str_replace("\n","<br>",$P);}function
checkbox($B,$Y,$eb,$je="",$pf="",$ib="",$ke=""){$I="<input type='checkbox' name='$B' value='".h($Y)."'".($eb?" checked":"").($ke?" aria-labelledby='$ke'":"").">".($pf?script("qsl('input').onclick = function () { $pf };",""):"");return($je!=""||$ib?"<label".($ib?" class='$ib'":"").">$I".h($je)."</label>":$I);}function
optionlist($D,$Wg=null,$Ii=false){$I="";foreach($D
as$ee=>$W){$vf=array($ee=>$W);if(is_array($W)){$I.='<optgroup label="'.h($ee).'">';$vf=$W;}foreach($vf
as$x=>$X)$I.='<option'.($Ii||is_string($x)?' value="'.h($x).'"':'').(($Ii||is_string($x)?(string)$x:$X)===$Wg?' selected':'').'>'.h($X);if(is_array($W))$I.='</optgroup>';}return$I;}function
html_select($B,$D,$Y="",$of=true,$ke=""){if($of)return"<select name='".h($B)."'".($ke?" aria-labelledby='$ke'":"").">".optionlist($D,$Y)."</select>".(is_string($of)?script("qsl('select').onchange = function () { $of };",""):"");$I="";foreach($D
as$x=>$X)$I.="<label><input type='radio' name='".h($B)."' value='".h($x)."'".($x==$Y?" checked":"").">".h($X)."</label>";return$I;}function
confirm($Je="",$Xg="qsl('input')"){return
script("$Xg.onclick = function () { return confirm('".($Je?js_escape($Je):'Are you sure?')."'); };","");}function
print_fieldset($Gd,$re,$Ui=false){echo"<fieldset><legend>","<a href='#fieldset-$Gd'>$re</a>",script("qsl('a').onclick = partial(toggle, 'fieldset-$Gd');",""),"</legend>","<div id='fieldset-$Gd'".($Ui?"":" class='hidden'").">\n";}function
bold($Ta,$ib=""){return($Ta?" class='active $ib'":($ib?" class='$ib'":""));}function
odd($I=' class="odd"'){static$s=0;if(!$I)$s=-1;return($s++%2?$I:'');}function
js_escape($P){return
addcslashes($P,"\r\n'\\/");}function
ini_bool($Rd){$X=ini_get($Rd);return(preg_match('~^(on|true|yes)$~i',$X)||(int)$X);}function
sid(){static$I;if($I===null)$I=(SID&&!($_COOKIE&&ini_bool("session.use_cookies")));return$I;}function
set_password($Qi,$M,$V,$F){$_SESSION["pwds"][$Qi][$M][$V]=($_COOKIE["adminer_key"]&&is_string($F)?array(encrypt_string($F,$_COOKIE["adminer_key"])):$F);}function
get_password(){$I=get_session("pwds");if(is_array($I))$I=($_COOKIE["adminer_key"]?decrypt_string($I[0],$_COOKIE["adminer_key"]):false);return$I;}function
q($P){global$f;return$f->quote($P);}function
get_vals($G,$d=0){global$f;$I=array();$H=$f->query($G);if(is_object($H)){while($J=$H->fetch_row())$I[]=$J[$d];}return$I;}function
get_key_vals($G,$g=null,$hh=true){global$f;if(!is_object($g))$g=$f;$I=array();$H=$g->query($G);if(is_object($H)){while($J=$H->fetch_row()){if($hh)$I[$J[0]]=$J[1];else$I[]=$J[0];}}return$I;}function
get_rows($G,$g=null,$l="<p class='error'>"){global$f;$zb=(is_object($g)?$g:$f);$I=array();$H=$zb->query($G);if(is_object($H)){while($J=$H->fetch_assoc())$I[]=$J;}elseif(!$H&&!is_object($g)&&$l&&defined("PAGE_HEADER"))echo$l.error()."\n";return$I;}function
unique_array($J,$v){foreach($v
as$u){if(preg_match("~PRIMARY|UNIQUE~",$u["type"])){$I=array();foreach($u["columns"]as$x){if(!isset($J[$x]))continue
2;$I[$x]=$J[$x];}return$I;}}}function
escape_key($x){if(preg_match('(^([\w(]+)('.str_replace("_",".*",preg_quote(idf_escape("_"))).')([ \w)]+)$)',$x,$A))return$A[1].idf_escape(idf_unescape($A[2])).$A[3];return
idf_escape($x);}function
where($Z,$n=array()){global$f,$w;$I=array();foreach((array)$Z["where"]as$x=>$X){$x=bracket_escape($x,1);$d=escape_key($x);$I[]=$d.($w=="sql"&&$n[$x]["type"]=="json"?" = CAST(".q($X)." AS JSON)":($w=="sql"&&is_numeric($X)&&preg_match('~\.~',$X)?" LIKE ".q($X):($w=="mssql"?" LIKE ".q(preg_replace('~[_%[]~','[\0]',$X)):" = ".unconvert_field($n[$x],q($X)))));if($w=="sql"&&preg_match('~char|text~',$n[$x]["type"])&&preg_match("~[^ -@]~",$X))$I[]="$d = ".q($X)." COLLATE ".charset($f)."_bin";}foreach((array)$Z["null"]as$x)$I[]=escape_key($x)." IS NULL";return
implode(" AND ",$I);}function
where_check($X,$n=array()){parse_str($X,$cb);remove_slashes(array(&$cb));return
where($cb,$n);}function
where_link($s,$d,$Y,$rf="="){return"&where%5B$s%5D%5Bcol%5D=".urlencode($d)."&where%5B$s%5D%5Bop%5D=".urlencode(($Y!==null?$rf:"IS NULL"))."&where%5B$s%5D%5Bval%5D=".urlencode($Y);}function
convert_fields($e,$n,$L=array()){$I="";foreach($e
as$x=>$X){if($L&&!in_array(idf_escape($x),$L))continue;$Fa=convert_field($n[$x]);if($Fa)$I.=", $Fa AS ".idf_escape($x);}return$I;}function
cookie($B,$Y,$ue=2592000){global$ba;return
header("Set-Cookie: $B=".urlencode($Y).($ue?"; expires=".gmdate("D, d M Y H:i:s",time()+$ue)." GMT":"")."; path=".preg_replace('~\?.*~','',$_SERVER["REQUEST_URI"]).($ba?"; secure":"")."; HttpOnly; SameSite=lax",false);}function
restart_session(){if(!ini_bool("session.use_cookies"))session_start();}function
stop_session($gd=false){$Hi=ini_bool("session.use_cookies");if(!$Hi||$gd){session_write_close();if($Hi&&@ini_set("session.use_cookies",false)===false)session_start();}}function&get_session($x){return$_SESSION[$x][DRIVER][SERVER][$_GET["username"]];}function
set_session($x,$X){$_SESSION[$x][DRIVER][SERVER][$_GET["username"]]=$X;}function
auth_url($Qi,$M,$V,$j=null){global$mc;preg_match('~([^?]*)\??(.*)~',remove_from_uri(implode("|",array_keys($mc))."|username|".($j!==null?"db|":"").session_name()),$A);return"$A[1]?".(sid()?SID."&":"").($Qi!="server"||$M!=""?urlencode($Qi)."=".urlencode($M)."&":"")."username=".urlencode($V).($j!=""?"&db=".urlencode($j):"").($A[2]?"&$A[2]":"");}function
is_ajax(){return($_SERVER["HTTP_X_REQUESTED_WITH"]=="XMLHttpRequest");}function
redirect($_,$Je=null){if($Je!==null){restart_session();$_SESSION["messages"][preg_replace('~^[^?]*~','',($_!==null?$_:$_SERVER["REQUEST_URI"]))][]=$Je;}if($_!==null){if($_=="")$_=".";header("Location: $_");exit;}}function
query_redirect($G,$_,$Je,$ug=true,$Lc=true,$Uc=false,$Wh=""){global$f,$l,$b;if($Lc){$xh=microtime(true);$Uc=!$f->query($G);$Wh=format_time($xh);}$sh="";if($G)$sh=$b->messageQuery($G,$Wh,$Uc);if($Uc){$l=error().$sh.script("messagesPrint();");return
false;}if($ug)redirect($_,$Je.$sh);return
true;}function
queries($G){global$f;static$pg=array();static$xh;if(!$xh)$xh=microtime(true);if($G===null)return
array(implode("\n",$pg),format_time($xh));$pg[]=(preg_match('~;$~',$G)?"DELIMITER ;;\n$G;\nDELIMITER ":$G).";";return$f->query($G);}function
apply_queries($G,$S,$Hc='table'){foreach($S
as$Q){if(!queries("$G ".$Hc($Q)))return
false;}return
true;}function
queries_redirect($_,$Je,$ug){list($pg,$Wh)=queries(null);return
query_redirect($pg,$_,$Je,$ug,false,!$ug,$Wh);}function
format_time($xh){return
sprintf('%.3f s',max(0,microtime(true)-$xh));}function
relative_uri(){return
str_replace(":","%3a",preg_replace('~^[^?]*/([^?]*)~','\1',$_SERVER["REQUEST_URI"]));}function
remove_from_uri($Kf=""){return
substr(preg_replace("~(?<=[?&])($Kf".(SID?"":"|".session_name()).")=[^&]*&~",'',relative_uri()."&"),0,-1);}function
pagination($E,$Pb){return" ".($E==$Pb?$E+1:'<a href="'.h(remove_from_uri("page").($E?"&page=$E".($_GET["next"]?"&next=".urlencode($_GET["next"]):""):"")).'">'.($E+1)."</a>");}function
get_file($x,$Yb=false){$Zc=$_FILES[$x];if(!$Zc)return
null;foreach($Zc
as$x=>$X)$Zc[$x]=(array)$X;$I='';foreach($Zc["error"]as$x=>$l){if($l)return$l;$B=$Zc["name"][$x];$ei=$Zc["tmp_name"][$x];$Db=file_get_contents($Yb&&preg_match('~\.gz$~',$B)?"compress.zlib://$ei":$ei);if($Yb){$xh=substr($Db,0,3);if(function_exists("iconv")&&preg_match("~^\xFE\xFF|^\xFF\xFE~",$xh,$_g))$Db=iconv("utf-16","utf-8",$Db);elseif($xh=="\xEF\xBB\xBF")$Db=substr($Db,3);$I.=$Db."\n\n";}else$I.=$Db;}return$I;}function
upload_error($l){$Fe=($l==UPLOAD_ERR_INI_SIZE?ini_get("upload_max_filesize"):0);return($l?'Unable to upload a file.'.($Fe?" ".sprintf('Maximum allowed file size is %sB.',$Fe):""):'File does not exist.');}function
repeat_pattern($Uf,$se){return
str_repeat("$Uf{0,65535}",$se/65535)."$Uf{0,".($se%65535)."}";}function
is_utf8($X){return(preg_match('~~u',$X)&&!preg_match('~[\0-\x8\xB\xC\xE-\x1F]~',$X));}function
shorten_utf8($P,$se=80,$Ch=""){if(!preg_match("(^(".repeat_pattern("[\t\r\n -\x{10FFFF}]",$se).")($)?)u",$P,$A))preg_match("(^(".repeat_pattern("[\t\r\n -~]",$se).")($)?)",$P,$A);return
h($A[1]).$Ch.(isset($A[2])?"":"<i>â€¦</i>");}function
format_number($X){return
strtr(number_format($X,0,".",','),preg_split('~~u','0123456789',-1,PREG_SPLIT_NO_EMPTY));}function
friendly_url($X){return
preg_replace('~[^a-z0-9_]~i','-',$X);}function
hidden_fields($lg,$Id=array(),$dg=''){$I=false;foreach($lg
as$x=>$X){if(!in_array($x,$Id)){if(is_array($X))hidden_fields($X,array(),$x);else{$I=true;echo'<input type="hidden" name="'.h($dg?$dg."[$x]":$x).'" value="'.h($X).'">';}}}return$I;}function
hidden_fields_get(){echo(sid()?'<input type="hidden" name="'.session_name().'" value="'.h(session_id()).'">':''),(SERVER!==null?'<input type="hidden" name="'.DRIVER.'" value="'.h(SERVER).'">':""),'<input type="hidden" name="username" value="'.h($_GET["username"]).'">';}function
table_status1($Q,$Vc=false){$I=table_status($Q,$Vc);return($I?$I:array("Name"=>$Q));}function
column_foreign_keys($Q){global$b;$I=array();foreach($b->foreignKeys($Q)as$p){foreach($p["source"]as$X)$I[$X][]=$p;}return$I;}function
enum_input($T,$Ha,$m,$Y,$Ac=null){global$b;preg_match_all("~'((?:[^']|'')*)'~",$m["length"],$Ae);$I=($Ac!==null?"<label><input type='$T'$Ha value='$Ac'".((is_array($Y)?in_array($Ac,$Y):$Y===0)?" checked":"")."><i>".'empty'."</i></label>":"");foreach($Ae[1]as$s=>$X){$X=stripcslashes(str_replace("''","'",$X));$eb=(is_int($Y)?$Y==$s+1:(is_array($Y)?in_array($s+1,$Y):$Y===$X));$I.=" <label><input type='$T'$Ha value='".($s+1)."'".($eb?' checked':'').'>'.h($b->editVal($X,$m)).'</label>';}return$I;}function
input($m,$Y,$r){global$U,$b,$w;$B=h(bracket_escape($m["field"]));echo"<td class='function'>";if(is_array($Y)&&!$r){$Da=array($Y);if(version_compare(PHP_VERSION,5.4)>=0)$Da[]=JSON_PRETTY_PRINT;$Y=call_user_func_array('json_encode',$Da);$r="json";}$Dg=($w=="mssql"&&$m["auto_increment"]);if($Dg&&!$_POST["save"])$r=null;$od=(isset($_GET["select"])||$Dg?array("orig"=>'original'):array())+$b->editFunctions($m);$ic=stripos($m["default"],"GENERATED ALWAYS AS ")===0?" disabled=''":"";$Ha=" name='fields[$B]'$ic";if($m["type"]=="enum")echo
h($od[""])."<td>".$b->editInput($_GET["edit"],$m,$Ha,$Y);else{$zd=(in_array($r,$od)||isset($od[$r]));echo(count($od)>1?"<select name='function[$B]'$ic>".optionlist($od,$r===null||$zd?$r:"")."</select>".on_help("getTarget(event).value.replace(/^SQL\$/, '')",1).script("qsl('select').onchange = functionChange;",""):h(reset($od))).'<td>';$Td=$b->editInput($_GET["edit"],$m,$Ha,$Y);if($Td!="")echo$Td;elseif(preg_match('~bool~',$m["type"]))echo"<input type='hidden'$Ha value='0'>"."<input type='checkbox'".(preg_match('~^(1|t|true|y|yes|on)$~i',$Y)?" checked='checked'":"")."$Ha value='1'>";elseif($m["type"]=="set"){preg_match_all("~'((?:[^']|'')*)'~",$m["length"],$Ae);foreach($Ae[1]as$s=>$X){$X=stripcslashes(str_replace("''","'",$X));$eb=(is_int($Y)?($Y>>$s)&1:in_array($X,explode(",",$Y),true));echo" <label><input type='checkbox' name='fields[$B][$s]' value='".(1<<$s)."'".($eb?' checked':'').">".h($b->editVal($X,$m)).'</label>';}}elseif(preg_match('~blob|bytea|raw|file~',$m["type"])&&ini_bool("file_uploads"))echo"<input type='file' name='fields-$B'>";elseif(($Th=preg_match('~text|lob|memo~i',$m["type"]))||preg_match("~\n~",$Y)){if($Th&&$w!="sqlite")$Ha.=" cols='50' rows='12'";else{$K=min(12,substr_count($Y,"\n")+1);$Ha.=" cols='30' rows='$K'".($K==1?" style='height: 1.2em;'":"");}echo"<textarea$Ha>".h($Y).'</textarea>';}elseif($r=="json"||preg_match('~^jsonb?$~',$m["type"]))echo"<textarea$Ha cols='50' rows='12' class='jush-js'>".h($Y).'</textarea>';else{$He=(!preg_match('~int~',$m["type"])&&preg_match('~^(\d+)(,(\d+))?$~',$m["length"],$A)?((preg_match("~binary~",$m["type"])?2:1)*$A[1]+($A[3]?1:0)+($A[2]&&!$m["unsigned"]?1:0)):($U[$m["type"]]?$U[$m["type"]]+($m["unsigned"]?0:1):0));if($w=='sql'&&min_version(5.6)&&preg_match('~time~',$m["type"]))$He+=7;echo"<input".((!$zd||$r==="")&&preg_match('~(?<!o)int(?!er)~',$m["type"])&&!preg_match('~\[\]~',$m["full_type"])?" type='number'":"")." value='".h($Y)."'".($He?" data-maxlength='$He'":"").(preg_match('~char|binary~',$m["type"])&&$He>20?" size='40'":"")."$Ha>";}echo$b->editHint($_GET["edit"],$m,$Y);$bd=0;foreach($od
as$x=>$X){if($x===""||!$X)break;$bd++;}if($bd)echo
script("mixin(qsl('td'), {onchange: partial(skipOriginal, $bd), oninput: function () { this.onchange(); }});");}}function
process_input($m){global$b,$k;if(stripos($m["default"],"GENERATED ALWAYS AS ")===0)return
null;$t=bracket_escape($m["field"]);$r=$_POST["function"][$t];$Y=$_POST["fields"][$t];if($m["type"]=="enum"){if($Y==-1)return
false;if($Y=="")return"NULL";return+$Y;}if($m["auto_increment"]&&$Y=="")return
null;if($r=="orig")return(preg_match('~^CURRENT_TIMESTAMP~i',$m["on_update"])?idf_escape($m["field"]):false);if($r=="NULL")return"NULL";if($m["type"]=="set")return
array_sum((array)$Y);if($r=="json"){$r="";$Y=json_decode($Y,true);if(!is_array($Y))return
false;return$Y;}if(preg_match('~blob|bytea|raw|file~',$m["type"])&&ini_bool("file_uploads")){$Zc=get_file("fields-$t");if(!is_string($Zc))return
false;return$k->quoteBinary($Zc);}return$b->processInput($m,$Y,$r);}function
fields_from_edit(){global$k;$I=array();foreach((array)$_POST["field_keys"]as$x=>$X){if($X!=""){$X=bracket_escape($X);$_POST["function"][$X]=$_POST["field_funs"][$x];$_POST["fields"][$X]=$_POST["field_vals"][$x];}}foreach((array)$_POST["fields"]as$x=>$X){$B=bracket_escape($x,1);$I[$B]=array("field"=>$B,"privileges"=>array("insert"=>1,"update"=>1),"null"=>1,"auto_increment"=>($x==$k->primary),);}return$I;}function
search_tables(){global$b,$f;$_GET["where"][0]["val"]=$_POST["query"];$Zg="<ul>\n";foreach(table_status('',true)as$Q=>$R){$B=$b->tableName($R);if(isset($R["Engine"])&&$B!=""&&(!$_POST["tables"]||in_array($Q,$_POST["tables"]))){$H=$f->query("SELECT".limit("1 FROM ".table($Q)," WHERE ".implode(" AND ",$b->selectSearchProcess(fields($Q),array())),1));if(!$H||$H->fetch_row()){$hg="<a href='".h(ME."select=".urlencode($Q)."&where[0][op]=".urlencode($_GET["where"][0]["op"])."&where[0][val]=".urlencode($_GET["where"][0]["val"]))."'>$B</a>";echo"$Zg<li>".($H?$hg:"<p class='error'>$hg: ".error())."\n";$Zg="";}}}echo($Zg?"<p class='message'>".'No tables.':"</ul>")."\n";}function
dump_headers($Hd,$Re=false){global$b;$I=$b->dumpHeaders($Hd,$Re);$Gf=$_POST["output"];if($Gf!="text")header("Content-Disposition: attachment; filename=".$b->dumpFilename($Hd).".$I".($Gf!="file"&&preg_match('~^[0-9a-z]+$~',$Gf)?".$Gf":""));session_write_close();ob_flush();flush();return$I;}function
dump_csv($J){foreach($J
as$x=>$X){if(preg_match('~["\n,;\t]|^0|\.\d*0$~',$X)||$X==="")$J[$x]='"'.str_replace('"','""',$X).'"';}echo
implode(($_POST["format"]=="csv"?",":($_POST["format"]=="tsv"?"\t":";")),$J)."\r\n";}function
apply_sql_function($r,$d){return($r?($r=="unixepoch"?"DATETIME($d, '$r')":($r=="count distinct"?"COUNT(DISTINCT ":strtoupper("$r("))."$d)"):$d);}function
get_temp_dir(){$I=ini_get("upload_tmp_dir");if(!$I){if(function_exists('sys_get_temp_dir'))$I=sys_get_temp_dir();else{$o=@tempnam("","");if(!$o)return
false;$I=dirname($o);unlink($o);}}return$I;}function
file_open_lock($o){$q=@fopen($o,"r+");if(!$q){$q=@fopen($o,"w");if(!$q)return;chmod($o,0660);}flock($q,LOCK_EX);return$q;}function
file_write_unlock($q,$Rb){rewind($q);fwrite($q,$Rb);ftruncate($q,strlen($Rb));flock($q,LOCK_UN);fclose($q);}function
password_file($h){$o=get_temp_dir()."/adminer.key";$I=@file_get_contents($o);if($I||!$h)return$I;$q=@fopen($o,"w");if($q){chmod($o,0660);$I=rand_string();fwrite($q,$I);fclose($q);}return$I;}function
rand_string(){return
md5(uniqid(mt_rand(),true));}function
select_value($X,$z,$m,$Vh){global$b;if(is_array($X)){$I="";foreach($X
as$ee=>$W)$I.="<tr>".($X!=array_values($X)?"<th>".h($ee):"")."<td>".select_value($W,$z,$m,$Vh);return"<table cellspacing='0'>$I</table>";}if(!$z)$z=$b->selectLink($X,$m);if($z===null){if(is_mail($X))$z="mailto:$X";if(is_url($X))$z=$X;}$I=$b->editVal($X,$m);if($I!==null){if(!is_utf8($I))$I="\0";elseif($Vh!=""&&is_shortable($m))$I=shorten_utf8($I,max(0,+$Vh));else$I=h($I);}return$b->selectVal($I,$z,$m,$X);}function
is_mail($yc){$Ga='[-a-z0-9!#$%&\'*+/=?^_`{|}~]';$lc='[a-z0-9]([-a-z0-9]{0,61}[a-z0-9])';$Uf="$Ga+(\\.$Ga+)*@($lc?\\.)+$lc";return
is_string($yc)&&preg_match("(^$Uf(,\\s*$Uf)*\$)i",$yc);}function
is_url($P){$lc='[a-z0-9]([-a-z0-9]{0,61}[a-z0-9])';return
preg_match("~^(https?)://($lc?\\.)+$lc(:\\d+)?(/.*)?(\\?.*)?(#.*)?\$~i",$P);}function
is_shortable($m){return
preg_match('~char|text|json|lob|geometry|point|linestring|polygon|string|bytea~',$m["type"]);}function
count_rows($Q,$Z,$Zd,$sd){global$w;$G=" FROM ".table($Q).($Z?" WHERE ".implode(" AND ",$Z):"");return($Zd&&($w=="sql"||count($sd)==1)?"SELECT COUNT(DISTINCT ".implode(", ",$sd).")$G":"SELECT COUNT(*)".($Zd?" FROM (SELECT 1$G GROUP BY ".implode(", ",$sd).") x":$G));}function
slow_query($G){global$b,$gi,$k;$j=$b->database();$Xh=$b->queryTimeout();$mh=$k->slowQuery($G,$Xh);if(!$mh&&support("kill")&&is_object($g=connect())&&($j==""||$g->select_db($j))){$he=$g->result(connection_id());echo'<script',nonce(),'>
var timeout = setTimeout(function () {
	ajax(\'',js_escape(ME),'script=kill\', function () {
	}, \'kill=',$he,'&token=',$gi,'\');
}, ',1000*$Xh,');
</script>
';}else$g=null;ob_flush();flush();$I=@get_key_vals(($mh?$mh:$G),$g,false);if($g){echo
script("clearTimeout(timeout);");ob_flush();flush();}return$I;}function
get_token(){$sg=rand(1,1e6);return($sg^$_SESSION["token"]).":$sg";}function
verify_token(){list($gi,$sg)=explode(":",$_POST["token"]);return($sg^$_SESSION["token"])==$gi;}function
lzw_decompress($Qa){$hc=256;$Ra=8;$kb=array();$Fg=0;$Gg=0;for($s=0;$s<strlen($Qa);$s++){$Fg=($Fg<<8)+ord($Qa[$s]);$Gg+=8;if($Gg>=$Ra){$Gg-=$Ra;$kb[]=$Fg>>$Gg;$Fg&=(1<<$Gg)-1;$hc++;if($hc>>$Ra)$Ra++;}}$gc=range("\0","\xFF");$I="";foreach($kb
as$s=>$jb){$xc=$gc[$jb];if(!isset($xc))$xc=$fj.$fj[0];$I.=$xc;if($s)$gc[]=$fj.$xc[0];$fj=$xc;}return$I;}function
on_help($sb,$jh=0){return
script("mixin(qsl('select, input'), {onmouseover: function (event) { helpMouseover.call(this, event, $sb, $jh) }, onmouseout: helpMouseout});","");}function
edit_form($Q,$n,$J,$Ci){global$b,$w,$gi,$l;$Hh=$b->tableName(table_status1($Q,true));page_header(($Ci?'Edit':'Insert'),$l,array("select"=>array($Q,$Hh)),$Hh);$b->editRowPrint($Q,$n,$J,$Ci);if($J===false){echo"<p class='error'>".'No rows.'."\n";return;}echo'<form action="" method="post" enctype="multipart/form-data" id="form">
';if(!$n)echo"<p class='error'>".'You have no privileges to update this table.'."\n";else{echo"<table cellspacing='0' class='layout'>".script("qsl('table').onkeydown = editingKeydown;");foreach($n
as$B=>$m){echo"<tr><th>".$b->fieldName($m);$Zb=$_GET["set"][bracket_escape($B)];if($Zb===null){$Zb=$m["default"];if($m["type"]=="bit"&&preg_match("~^b'([01]*)'\$~",$Zb,$_g))$Zb=$_g[1];}$Y=($J!==null?($J[$B]!=""&&$w=="sql"&&preg_match("~enum|set~",$m["type"])?(is_array($J[$B])?array_sum($J[$B]):+$J[$B]):(is_bool($J[$B])?+$J[$B]:$J[$B])):(!$Ci&&$m["auto_increment"]?"":(isset($_GET["select"])?false:$Zb)));if(!$_POST["save"]&&is_string($Y))$Y=$b->editVal($Y,$m);$r=($_POST["save"]?(string)$_POST["function"][$B]:($Ci&&preg_match('~^CURRENT_TIMESTAMP~i',$m["on_update"])?"now":($Y===false?null:($Y!==null?'':'NULL'))));if(!$_POST&&!$Ci&&$Y==$m["default"]&&preg_match('~^[\w.]+\(~',$Y))$r="SQL";if(preg_match("~time~",$m["type"])&&preg_match('~^CURRENT_TIMESTAMP~i',$Y)){$Y="";$r="now";}if($m["type"]=="uuid"&&$Y=="uuid()"){$Y="";$r="uuid";}input($m,$Y,$r);echo"\n";}if(!support("table"))echo"<tr>"."<th><input name='field_keys[]'>".script("qsl('input').oninput = fieldChange;")."<td class='function'>".html_select("field_funs[]",$b->editFunctions(array("null"=>isset($_GET["select"]))))."<td><input name='field_vals[]'>"."\n";echo"</table>\n";}echo"<p>\n";if($n){echo"<input type='submit' value='".'Save'."'>\n";if(!isset($_GET["select"])){echo"<input type='submit' name='insert' value='".($Ci?'Save and continue edit':'Save and insert next')."' title='Ctrl+Shift+Enter'>\n",($Ci?script("qsl('input').onclick = function () { return !ajaxForm(this.form, '".'Saving'."â€¦', this); };"):"");}}echo($Ci?"<input type='submit' name='delete' value='".'Delete'."'>".confirm()."\n":($_POST||!$n?"":script("focus(qsa('td', qs('#form'))[1].firstChild);")));if(isset($_GET["select"]))hidden_fields(array("check"=>(array)$_POST["check"],"clone"=>$_POST["clone"],"all"=>$_POST["all"]));echo'<input type="hidden" name="referer" value="',h(isset($_POST["referer"])?$_POST["referer"]:$_SERVER["HTTP_REFERER"]),'">
<input type="hidden" name="save" value="1">
<input type="hidden" name="token" value="',$gi,'">
</form>
';}if(isset($_GET["file"])){if($_SERVER["HTTP_IF_MODIFIED_SINCE"]){header("HTTP/1.1 304 Not Modified");exit;}header("Expires: ".gmdate("D, d M Y H:i:s",time()+365*24*60*60)." GMT");header("Last-Modified: ".gmdate("D, d M Y H:i:s")." GMT");header("Cache-Control: immutable");if($_GET["file"]=="favicon.ico"){header("Content-Type: image/x-icon");echo
lzw_decompress("\0\0\0` \0„\0\n @\0´C„è\"\0`EãQ¸àÿ‡?ÀtvM'”JdÁd\\Œb0\0Ä\"™ÀfÓˆ¤îs5›ÏçÑAXPaJ“0„¥‘8„#RŠT©‘z`ˆ#.©ÇcíXÃşÈ€?À-\0¡Im? .«M¶€\0È¯(Ì‰ıÀ/(%Œ\0");}elseif($_GET["file"]=="default.css"){header("Content-Type: text/css; charset=utf-8");echo
lzw_decompress("\n1Ì‡“ÙŒŞl7œ‡B1„4vb0˜Ífs‘¼ên2BÌÑ±Ù˜Şn:‡#(¼b.\rDc)ÈÈa7E„‘¤Âl¦Ã±”èi1Ìs˜´ç-4™‡fÓ	ÈÎi7†³¹¤Èt4…¦ÓyèZf4°i–AT«VVéf:Ï¦,:1¦Qİ¼ñb2`Ç#ş>:7Gï—1ÑØÒs°™L—XD*bv<ÜŒ#£e@Ö:4ç§!fo·Æt:<¥Üå’¾™oâÜ\niÃÅğ',é»a_¤:¹iï…´ÁBvø|Nû4.5Nfi¢vpĞh¸°l¨ê¡ÖšÜO¦‰î= £OFQĞÄk\$¥Óiõ™ÀÂd2Tã¡pàÊ6„‹ş‡¡-ØZ€ƒ Ş6½£€ğh:¬aÌ,£ëî2#8Ğ±#’˜6nâî†ñJˆ¢h«t…Œ±Šä4O42ô½okŞ¾*r ©€@p@†!Ä¾ÏÃôş?Ğ6À‰r[ğLÁğ‹:2Bˆj§!HbóÃPä=!1V‰\"ˆ²0…¿\nSÆÆÏD7ÃìDÚ›ÃC!†!›à¦GÊŒ§ È+’=tCæ©.C¤À:+ÈÊ=ªªº²¡±å%ªcí1MR/”EÈ’4„© 2°ä± ã`Â8(áÓ¹[WäÑ=‰ySb°=Ö-Ü¹BS+É¯ÈÜı¥ø@pL4Ydã„qŠøã¦ğê¢6£3Ä¬¯¸AcÜŒèÎ¨Œk‚[&>ö•¨ZÁpkm]—u-c:Ø¸ˆNtæÎ´pÒŒŠ8è=¿#˜á[.ğÜŞ¯~ mËy‡PPá|IÖ›ùÀìQª9v[–Q•„\n–Ùrô'g‡+áTÑ2…­VÁõzä4£8÷(	¾Ey*#j¬2]­•RÒÁ‘¥)ƒÀ[N­R\$Š<>:ó­>\$;–> Ì\r»„ÎHÍÃTÈ\nw¡N åwØ£¦ì<ïËGwàöö¹\\Yó_ Rt^Œ>\r}ŒÙS\rzé4=µ\nL”%Jã‹\",_\"2º—¸\\Üì¨¨éÉ¯êmÛd\rúõ'Ù2º²½g\\(÷@Ç‰é™ŸsZ“ñª÷£wZ:ÌÌ0£f'İ¨ÃCî7öXc#{ğ|Qy¾x\\×#¨Ò×²~Ã§íû¿ğHßfçuÁv»tZv?Üöƒ#Ü{ÏÑ¿gÊşC¸a!¼‡µĞºŠÒ !©,8óPn\nŠ™KÎ¸Å‚âòÈ“1ì^‚D‹.4f@šÔÊŠAº,Jö`d°Î€sZá¡©–`XŒHj‡Pä†ÂÅa#9°v!-s¸ChnpV˜x4AàâoE­Å:B”´Ry(ëY õ°µŠ›0¬˜­F%µá„\rò˜ïœ\"Æ‘Â;«pX#ärSğ·”cì½AÓ£…1ö9©idd3¡OÈ‰@Ğ\\KH¨r…Àéû0ˆ¶ê[¤—Rd&ß'Ø[ª†M}5'ÔB›¤°m¡Ì¡†u6™ÑF!º--öº`ì²–†[.õ2º\$ÚfV.9U%¤Á	‡ó\nZ©¸ÀÊ—òıJ(õÆ´6ÆÍaHc{Rj\\&`nˆt–%å¾dÎr9áIfŠ&w„iá%ƒP)¤\\@`\\@”»í™‹€#ZAaLMÓˆÁ¹bqÖ\"FJ:Cš#Ch}¢j]ÓÊ†äÃd±?–RlÈÅî¯á :çÂKb.ğàÁÆr’T×\nCtPGx¼Šl‡áLë'Í!MÓÚjÚ!Ht!ÁM¶>¿Û%NOQÆ{%ƒxp0Áº<Äê’D6E¡OU7\\ê´)1Á”;§˜gR—AŞSt1Â’\"OÉín• ¼pÉ\nC˜qVÎYN’²AÄ86P¨Hù\nè\$DŠ’ÅÕ\$’’Û:k=©)²Ié|¡İ2æfÉ–Gqló‡´&¸ØIhiak(6¬rXëÆ~Ã¨rB-äëÂ’<–N,T,0`6>ÌÊAH24ª Üiù!­«%xØÑb_8ˆ‚R\rAeß¼ Öğàn\nnª³iö1ÂšH¡÷aä€]ÀÃw¯%ã¼ˆ”Y3ˆØ)@*…FÒĞßpØ>ä;J{>Fˆä×?j½k²Ë}Ë{{,A‰8Â¡êÊ”’Æô5Ã¢èä e’2\";G)¹‡îˆ:º˜Œ7†r,ÄãTl›)RáUº¦ Ùo/¸„©ãJˆA÷+.5@òCK#–Tæ)Ák‡²XÈLÁÌªå„’BPÊ»!…ø•2r”²Àåme)ä…ÿ!Ì9ßõNºœS_1…( _s”£¹Vw)-¿&t³ƒ‰Ê9Ì¨C£;¨~\r08ÇÖğó\\b^Q™\0= äˆCİ‡‡à³h¼k£t‚šÏ8¢HYÙ‹U¸;ÓÚ‚j3/è#Ñ•p Gå½Õ9áh¥jflÏe¸¸aâ£™ÙªCJl¡}eÔv.Â¥×DÁ¥cÛ‰ËÖB…O4îB¡Š¬Ê}\$óo0Ft¥›C–Œ9S«Šµr~‘‰3+cíÁw;Í Ëiì…ÀâwKi@lpêÊÜÌ¶¢OH[O.aD„’,æQ<“µsjr±ö™¥ÀöË]uÌ+¦3öÖ‚0çC\nfÎ¹¤6=ùJ‰¯VÕà¾²ºN’W«Ï\r?éXƒYaèYô4ØsµÏ/:Å1kìh¬™ÊÍB¦“.\"Ê’2Ivâİr¸Oy¾Wƒ9gp˜¾]Ì\n×5á˜––eëvöXÈ=ºÚ³şóÚûİéë7iK×Œ–`©-_½6¥I‚Ò¾â `CÁí…!È:À@6r@ã	lù¿;œ!ÿœóÛÔúyE&}oRÎjú£1›çõÙÏÀåÒHr-|ª¿Óyí–†vn\\Ú4eüöÊ•^ÛÚKz¤)¼WnóŞ¡¶SfŸ†ñÌJœU#Ùv‹}×²>ÒÛ<ıêÏø+çâø­iü=àoîA_ÂÍ\$„ÄmoÒB…lZobBŒ¦¯|‚¾ÈÏætp\nm¥6?#^¦zÎ¼ €–Còî\"nóÂ`L\0Pk¦¾°Àt\0pl`R`\\ıig\"Bûís\0ìªçŠS>¬‚Õ,¢@æLÒú'xÛe§nÕ£n®­Ä°ĞÎ´ğ­rûîŞìÿOˆú¯]ŒòÆ0a\0000v-ğzLcæp ûMíOŞ°1BlÎk°„ëÿHcŠíÍ™ëœæo~=­àŞP¤û]Ä¨’Í`‘¥Š%n%-F~Õ‹ò‰&–	,:#¦“bòEŠtÃª€Úâ\r¨Ã©1G‘C±N:`Z1QZ:€à\r\0àèqb±g±Lt±]`¿|:ˆ…#}1‹é6¾+Iqu‘s|ñ£€¾¥È¤œ¤Ä\0fon+VL ``7ñ¬} ß1Õ€ê\rñ‘\0ÊK1rVñ×Ë\r€¿sc#¨+ëñÛR¦&—	tÔ±+‘	è\0r‘Ÿ±Ôàì)±«²:4’’B¯KŒÒîJ®bñeÑğZò17\$2? @ß&!ÒJärQi+q¬{G¬F®#ÂQ /‰q(Q!ñ\\S\0Ï	iä*H‡#\n’\rò©+@Æ–’qÒ³&Ò»*ÒÂ:’Ç# Ùl…Š´	ËqÆ²/’ è…,ª+« òù+R÷’ÇÑ,s,R«-Qs+àç/ó)rÚ\rq¾7RiÑ2à%ˆÖ˜‘r\0Û’ “kG3R³3³?¤/Lë0²«1’ÊCàè¶âì!Bß'òÿ+qó6ó	6òÔ“gZF.‰‘8Ù©q7óƒ3QŠ\r`Ê1‘1³”p/Ñ993—,æD‚³|·3)Ñ‰1£^iIq4s¹# ¿s­&R¹(k<ÓÕ,“Û ß<ñÓ=2cÓà¢Û7rs àóÙ>²5>“öóû?ô?QÑ Ú–‹>T74At\rA3İ@‚0€Æ]7j9T3?-\"Rß2±ÆTM.±\\akEQœŞ\"eÔ% ´] ƒ:-óp“iı#\nsQC)É6b©ïm{4@Â3X×±œï¢\n·+v4{<sÍEò1qT0-…\$c#K2c?ÔJ‘9F0=4=CTÁÃ \r³‚ÓtŠWäö³B\rŠÿ<qBr[Aô¹@tí<’^räoMé\\OäI<r¡O3•\r-+Q [U\"5Lôï7ÒTŠ—¾)â—5éhƒ\0P>Ã^\$\0j·5J€¦äŠ6kĞ.tz:K–3ƒ<4µf¸Ä¶4ã\"2tÜáÒ|D•4\rÃÀ,\$KH>ö•ET‚áTãU)F.[%^2µcH†~â¢ä");}elseif($_GET["file"]=="functions.js"){header("Content-Type: text/javascript; charset=utf-8");echo
lzw_decompress("f:›ŒgCI¼Ü\n8œÅ3)°Ë7œ…†81ĞÊx:\nOg#)Ğêr7\n\"†è´`ø|2ÌgSi–H)N¦S‘ä§\r‡\"0¹Ä@ä)Ÿ`(\$s6O!ÓèœV/=Œ' T4æ=„˜iS˜6IO G#ÒX·VCÆs¡ Z1.Ğhp8,³[¦Häµ~Cz§Éå2¹l¾c3šÍés£‘ÙI†bâ4\néF8Tà†I˜İ©U*fz¹är0EÆÀØy¸ñfY.:æƒIŒÊ(Øc·áÎ‹!_l™í^·^(¶šN{S–“)rËqÁY“–lÙ¦3Š3Ú\n˜+G¥Óêyºí†Ëi¶ÂîxV3w³uhã^rØÀº´aÛ”ú¹cØè\r“¨ë(.ÂˆºChÒ<\r)èÑ£¡`æ7£íò43'm5Œ£È\nPÜ:2£P»ª‹q òÿÅC“}Ä«ˆúÊÁê38‹BØ0hR‰Èr(œ0¥¡b\\0ŒHr44ŒÁB!¡pÇ\$rZZË2Ü‰.Éƒ(\\5Ã|\nC(Î\"€P…ğø.ĞNÌRTÊÎ“Àæ>HN…8HPá\\¬7Jp~„Üû2%¡ĞOC¨1ã.ƒ§C8Î‡HÈò*ˆj°…á÷S(¹/¡ì¬6KUœÊ‡¡<2‰pOI„ôÕ`Ôäâ³ˆdOH Ş5-üÆ4ŒãpX25-Ò¢òÛˆ°z7£¸\"(°P \\32:]UÚèíâß…!]¸<·AÛÛ¤’ĞßiÚ°‹l\rÔ\0v²Î#J8«ÏwmíÉ¤¨<ŠÉ æü%m;p#ã`XDŒø÷iZøN0Œ•È9ø¨å Áè`…wJD¿¾2Ò9tŒ¢*øÎyìËNiIh\\9ÆÕèĞ:ƒ€æáxï­µyl*šÈˆÎæY Ü‡øê8’W³â?µŞ›3ÙğÊ!\"6å›n[¬Ê\r­*\$¶Æ§¾nzxÆ9\rì|*3×£pŞï»¶:(p\\;ÔËmz¢ü§9óĞÑÂŒü8N…Áj2½«Î\rÉHîH&Œ²(Ãz„Á7iÛk£ ‹Š¤‚c¤‹eòı§tœÌÌ2:SHóÈ Ã/)–xŞ@éåt‰ri9¥½õëœ8ÏÀËïyÒ·½°VÄ+^WÚ¦­¬kZæY—l·Ê£Œ4ÖÈÆ‹ª¶À¬‚ğ\\EÈ{î7\0¹p†€•D€„i”-TæşÚû0l°%=Á ĞËƒ9(„5ğ\n\n€n,4‡\0èa}Üƒ.°öRsï‚ª\02B\\Ûb1ŸS±\0003,ÔXPHJspåd“Kƒ CA!°2*WŸÔñÚ2\$ä+Âf^\n„1Œ´òzEƒ Iv¤\\äœ2É .*A°™”E(d±á°ÃbêÂÜ„Æ9‡‚â€ÁDh&­ª?ÄH°sQ˜2’x~nÃJ‹T2ù&ãàeRœ½™GÒQTwêİ‘»õPˆâã\\ )6¦ôâœÂòsh\\3¨\0R	À'\r+*;RğHà.“!Ñ[Í'~­%t< çpÜK#Â‘æ!ñlßÌğLeŒ³œÙ,ÄÀ®&á\$	Á½`”–CXš‰Ó†0Ö­å¼û³Ä:Méh	çÚœGäÑ!&3 D<!è23„Ã?h¤J©e Úğhá\r¡m•˜ğNi¸£´’†ÊNØHl7¡®v‚êWIå.´Á-Ó5Ö§ey\rEJ\ni*¼\$@ÚRU0,\$U¿E†¦ÔÔÂªu)@(tÎSJkáp!€~­‚àd`Ì>¯•\nÃ;#\rp9†jÉ¹Ü]&Nc(r€ˆ•TQUª½S·Ú\08n`«—y•b¤ÅLÜO5‚î,¤ò‘>‚†xââ±fä´’âØ+–\"ÑI€{kMÈ[\r%Æ[	¤eôaÔ1! èÿí³Ô®©F@«b)RŸ£72ˆî0¡\nW¨™±L²ÜœÒ®tdÕ+íÜ0wglø0n@òêÉ¢ÕiíM«ƒ\nA§M5nì\$E³×±NÛál©İŸ×ì%ª1 AÜûºú÷İkñrîiFB÷Ïùol,muNx-Í_ Ö¤C( fél\r1p[9x(i´BÒ–²ÛzQlüº8CÔ	´©XU Tb£İIİ`•p+V\0î‹Ñ;‹CbÎÀXñ+Ï’sïü]H÷Ò[ák‹x¬G*ô†]·awnú!Å6‚òâÛĞmSí¾“IŞÍKË~/Ó¥7ŞùeeNÉòªS«/;dåA†>}l~Ïê ¨%^´fçØ¢pÚœDEîÃa·‚t\nx=ÃkĞ„*dºêğT—ºüûj2ŸÉjœ\n‘ É ,˜e=‘†M84ôûÔa•j@îTÃsÔänf©İ\nî6ª\rdœ¼0ŞíôYŠ'%Ô“íŞ~	Ò¨†<ÖË–Aî‹–H¿G‚8ñ¿Îƒ\$z«ğ{¶»²u2*†àa–À>»(wŒK.bP‚{…ƒoı”Â´«zµ#ë2ö8=É8>ª¤³A,°e°À…+ìCè§xõ*ÃáÒ-b=m‡™Ÿ,‹a’Ãlzkï\$Wõ,mJiæÊ§á÷+‹èı0°[¯ÿ.RÊsKùÇäXçİZLËç2`Ì(ïCàvZ¡ÜİÀ¶è\$×¹,åD?H±ÖNxXôó)’îM¨‰\$ó,Í*\nÑ£\$<qÿÅŸh!¿¹S“âƒÀŸxsA!˜:´K¥Á}Á²“ù¬£œRşšA2k·Xp\n<÷ş¦ıëlì§Ù3¯ø¦È•VV¬}£g&Yİ!†+ó;<¸YÇóŸYE3r³Ùñ›Cío5¦Åù¢Õ³Ïkkş…ø°ÖÛ£«Ït÷’Uø…­)û[ıßÁî}ïØu´«lç¢:DŸø+Ï _oãäh140ÖáÊ0ø¯bäK˜ã¬’ öşé»lGª„#ªš©ê†¦©ì|Udæ¶IK«êÂ7à^ìà¸@º®O\0HÅğHiŠ6\r‡Û©Ü\\cg\0öãë2BÄ*eà\n€š	…zr!nWz& {H–ğ'\$X  w@Ò8ëDGr*ëÄİHVéŞw8ìJè\nm@¦OÈ#P²Ï@úYp²ÏÃ¶wàÊğÀP\r8ÀXë\$Xü Pİd–	ÀQ\0Rx1\"T]\"êĞè Í	°êQĞğàÀbR`MÛğà-àRSE8Go0 ê	æd‚B^±\0ÂÜ\":ÜmN.Şj%ß@æ3(ªx Âl ÌÅŞ	‘€W ßåŞ\nç:\r\0}®@³qm;@È-¢Ş¤Zôg.zFÂf@Ì\rW®Äck‰Œ ñ<	é0‡Ëúz'4\rñ­\0îjELYˆğ(ğ%€\nM‡ÄDÃÂoFøB¨q‘ÖKg²ä#ÄZ¨¸³àä\"\nçÀĞ®ÅêhŞÒ‹2-n§\"jy\"¥ê§èşì\"÷ğgı!,Ä*ŒTù x¢ÅËPú‚5%Làèò`¾LÖM†¬@¶ Z@ºìÊÒ`^Q0R%9&jv‘häX ğoöö‹G#æ’ö²DÙòHùKÂ¼lX¼ï¦Í-äû2hWli+æ&ÄÕs'rzìàÉ(„Òˆ‚ò¼¿%tKå6ûrâ¶ëràïáK.î¢‰Â‚*Ğ,*vbgj#²óLÈ®v®Z‹€Q\$pÜn*hòÀòvÂBñôâÀ\\FJˆX%x f\$óA4K74 a#¤¦3\n¨(|°Z,³e2äl\r|Kû0Ğò¿³¦ÎW2-m)	)‘¾Z'%€Ü	ªè7å.›*í*\0O;’®C¥*¯—\$ËA;’VÌò¸ë‚(€ÚlìØt‚Kã.DÆ›_>á:¥v¢3Ÿ=dö\$Ræ“ øSlß7ˆºB[ì!@È]à[63zS…e>sòr„Dz€í;T0²SÁ*ïCË+oª\\\0ÒÀ{D´Ükè€z@·= »¥·Dª4Vç‚Ê•*\0Wÿ³tÿäv¶¥yDÌ-¢5CŒæ3•¾…ıD´–t”›!’_ U”XL´]F÷Fn—F ì&@%b>cˆêPÜÛIö)3<’@ `ä\r“55Ş%¤/3Qœó@Gó5\rÍÄÑ±T£è,§ŞEÍNÈ&j\0ÆhÌ¾\$Üá È353‘TB'FLâÀ¦'DäñøU#±LÑÉPm*Ñ \\\r@êò@¨)íşE­ÓUUU•]V†ñïŞ`‡MµÒóRD³FV {4Õ`3U4•‹5§‚#ÃT`èQ(ğßµq7M÷*@SVMÈÄ¢#ê~ƒ2 Õ´Ñjl¤@·\\ İ.J|2“U¡\\¬º Ëv·°«\\b;^\0Û6x·Î‡]ëµ^uøîõULµZ§å—MPÖ™¬4Hû9µ\$0å3Í'VuTõ@ƒKW•|ñ/\$J*D´÷]î	X“·_pªõšŞ•Ñ¥ÄÕ²uü¤I¬Ü…zä¢®ÀÖr…Ş\n€Ò%¤8š“i^Èò»U¡15³n;I\n§R­Ÿ3§ÙQU45…5`z€ac¶­b°`qOtÙNu 6)õTÿ¯‹jµ“X–´ReÈ#ÈJ-„S@á\"U¶ëÀÎÒCÊUUß8³‘6Ø-kií/YÊ¡ R\$ğ¼!·\rn×[6Vİ­íqÕ€Ê.åÎB‘¢°¦cp­pps!\0»Ow\"çngsôX³wGiÈ{Z\0Su*k`”ÎÖa!Qo'd òx Caö ö¤cë!ƒºŞ60P°\rÊ‚‹T¯ÒœµËú¦ï¿,jÁ&ğ@Êƒ( OA€æP÷T¯jÕßGhÎ»b¶¯Ì\"%°\n‹qX€z %‚ÃÅÈÎëm~@Ï~‹r¶ÖJnWâ~ Î	¨]RXûFÖír’ÍxNmHp ñ+@Ñkl#€Û\0ËívÔX&…Ø,iÍd¥zÔÓ\0äNıø~wêü¸„×û€Ø\0äWá·ı\0ñKNÆm†	0ÍpÓíB×¥Ó'X)„`Y†e±‡XyI: Ë`dÑ t¶\nÚ('N\r€àHGuKše¨\0Ÿ€Ä*3’æ)n3Í¤ oä“Vò}vö¯ô¦æN\\°ØØèÜ1i)\".`t„>\rØÛcÈßó—fãŒoA—©\"×­±³ É OyYïFÒ\rá[5BÂo*/t“(ÅÅ%²úR[<òï8V‘“\$AMï¨¬5¨±9'*ŒX¤úö†‡ğÜ…ˆ\\†æ\"jrDÔ\re·ˆàX|ªê^©n#‚dÍ¥lÙÇn‚©¦ªM¹¦t€~\\…Í›\0™›@á›‚g=Ñ2¬À‚.†*\0@Ô'9¾—yÚ ™ß9æ dæ	£zq„6ò€]œP~\n€ Pì:‰Ù<ƒ¥œâ DY„:]5[[¢'I¢—ËFùö…º\$Bâ<“P’P—@N”0/Eú:^ DÈJw¹¥\0€_Cdz#¢zFW4(Kú{¤U[¨ı{>\0^%ĞM@XSÚ‡£ZŒSlWº™¥…wYº Ş”\"B*R` 	à¦\n…ŠàºĞQCFè*º»ˆYÌÍ§e‡Æêˆ+âH¸j™\$ÕQ À^\0Zk`îªV¦B%Â(X**2šÍºèº»®æôN`°ºê| È±„-©“ ‡í³«~8Zæ Æ‡Rz2\"È	Jî4›S~J»&tŠ¾e‚m¤Và}®ºNÖÍ³'²Úrú5f.&1ùÀ›jâğ‹§§úK¤åm¹{‰¤`º†w Ü!•^#5¥TK¥„¹Eâhq€å¦\$÷ñ®kçx|Úm¥:sDºd…zA§Ú‹?…¾ºˆ“[ğLÒÈ¬Z²Xœ®: ¹„¸[(!‡k¬X²V¹yƒ¾° ©Â“­ï\$\0C¢9ˆdSi¹in‚ {`”\n`	ÀÄ|K Â¸:ç»5ä»º# t}xĞN„÷»{»[¸)êûC£ÊFKZâj™Â€PFY–BäpFk–›0<Ú@ÊD<JE™ºi0“5Ãø®•T\"¬ãVhº¬Á”ÄNÌŒ“HùWDeSsŒ’ûNŠô\0ËxD²¸L1„ªë¬<!ÎÔ\r3ÚÍÅqd´öK3…P”ÓyÈÔë¢E/`ğƒPz€Ş–\n ùÏdYÏ¼şš½5Xïı8W•ÑI8w[7Û³`ª\n@’¨€Û»Cpš¬¨PÛÔåƒÕ=V\rıZ{*qİ\$ R”×Ö“ŠÆeqĞ¬Ä+U`ŞB¤çOf*†CÌLºMCä`_ èüü½ËµO\næTâ5Ú&C×½©@¸à\\WÅe&_X_Ü».·8œ4d YÃ¼œ‰Âp\$ezAµµ[\$]ò<]»|`,\rul\r5áqpÊdu èéˆ±ç´Œ£ö¯ÀYi@û¥çz\nâ¨Ş7ßş;“È€‚¼­½Ü7ßb'¼dmh×â@qíõChö+6.J­×W¶Éc÷e]ó‘eïkZ‚0ßåşZ_yŠè‡fØpc8&‰©æÍ‚üœz\0„EØÎÍ7º0€	ŒÓ\"ö\$êÇ=‹İìÅ!>úæ€‚g7B-QÆ/e&ßÆ‡­6a€˜p\rÄe3›cÕNIjn-Ä\$*x-WVİjõ”@oÎ#wó5óˆ'OÏ.œöÇMÇÙˆ\0èHøCÖ9ïÚÀ-míP™îƒ8S v!Àè;gtLŞ5,	ñ€#¿n# •Ş‘“x-7ùf5`Ø#\"NÓb÷¯g˜Ÿ£ö Üeübãå÷,7S§¥òGjÙíoÕ‹F?ÀTŒ6ƒİîËmÄÌs‘š€¸-§˜m6§£q‘œ;‚dl¤ÕÏé0fE€8ô]P'X\n›ÿàMGï–\0£Üx‡\0É5¢€ÂÍ*Ä#ø*à1>*]È–Ws\rœ®,¿’àÀØ\0öO–,q2Íj•+H ÃŞFG€º³E¶>d@bÑ÷±¢Iz¡aR¸à8@7¡LB¦åş‚H‚ ½è¦A¸Ë³Ép¥p@Ê	 d¨kƒz4EƒA‚	Ã‚ƒß‰ºóWA1\"À2bGk\"£\0ÀdƒhíRD¥p !fPs3`FÔ´¿e	OkLA¦Ó‘C—/ ´a@|@¦²€:!âƒ‹á˜‚»…o‰T/b¼“¡‚Èá¤lL8èˆDjÊ„öë@2ºÙüÎº€ƒìENë\"¾1ÃÈzqÂ,\\^ãÔ)8V°½qÓÁÂ1	â<í'4ÙÖÏÌÊäáC!ÎFš…´4 €f‰‡t cº†±µÂ\r¸m—z¡*M¦®(ÁƒA†¸†„÷À2Á)’Pr¬ÆŠà²ˆ¤45	 Î\0Z[dá9¨hY‡ »ˆŞt1e¯EŒ\$o`ÆX ¡gèUd\0G¨~DR<èÒhUp€y¦“=­T(‰DZ-bHÓÈ ú‘ya¢H²¯°lb¬b(œâHLÀú8e¤sC«½Ûe³I¬=Dğë{ĞĞŞú]È<ÑaâœŠQ=Tû\$!CáOÙ¾UèG²â)ª“Q¼VÃTb\".\r­Í@<)‘o¢`œV\r0q—j‹s¡Xˆ¤F\"*åbIùÚ¢|øÄAˆ hp\\	²‹X¨j#ˆbË#œ©ÅO>5w°?TóÉ¾;öÁªlò1aÖc\"t5v©Ä®Á¾`‹x\\CM=ib„¨!.¯HLÂmâH–ÛÒ¬ãñ–%+¥£ĞD4FøÚ¼Ñé£C©[KX}P¹  >e:V¡t—;ì#Ñ¦„Ä&‡Rñ©‘È´p’,aË˜ HåÆœ·ÑÎDt\0é\$qŸµñÀ/t›õ–~‡J›¥·éî`Ãö,ãº¼¶‰]ÀÎ`å%3®>Ş¢´@N­Óx1,ö¯ªùrÏxr):ğ˜8ÓäÀˆˆ 0†Ì‘ÚB«,EúAˆò‡íùåàBá0(•üÈEùã8@Œn[	(–ñåhídDÙ	HR£Q¼†^µ!± Èv<² „„‘6œÕı’Eò\"œ&ç…¸ÅV(GBü’UªËé_¦«ûHü½sÛ@Õ*BN)QH£ˆævTG‚Æ0ùhØRÙ¥Ù†+õ-Ô&TúCó?ÀÀzd\0\$¨bSÚ¡<ÆãÜ‰Q„í@º P®ÀdpOÓ>+‰>x|Ì	¡Me‰EˆùR€4 ‡k(W{´*-¨G\$ …È	'Òj\0œ‡H½ü¥¥	(ØÑ™>A%‡YêÏÀÊ´ñ6Évò«£ÇŞ^¦K• G%2ÌEdÍ”<öJ¡#ÀDE{0\$…T+ş2T%Š#&ˆŠW2Íe³ä¹\nSä§†Lã–cšdÇ—²°hÀ=–ê|e²\"' ¢[­¼óa2#%=ËuÉk©:6É,ÒüKÎ\\’âd¼È—YGr;Â·–Á=ÀØ  ²öLÉ´XyVšh*…‚ŒO *»ÍFšˆà-bK*Š#‚†‰:.<ÇRY\"EU'x3eQÁŸÚü©”’qÍ@>™bK®x‡Ä4e… D¥G?!éáN¥xk©aŞ4@/¡˜\rc0Ò¬ÀD³!¾ @ á;€D9\$:·”&€ “Wå\$ÂÃR5ÒÚ—HAŞ2o=•@=›:œáÅ\n%ú¢ü@og”¼Î³]¬ótT¹&ê# ¸ˆÈqU™øf‚æc@ùÓ|BW&ø_‰¿¨Î\rÿR\"(L•zr‚s5*ıT’¸™ -5\"ÉZ74È%£ñ\\!yÎ’„7Kâ @Z‚™Í/v\0/I´ÃÖ¯‡s®ø@äÀ11œ& -FÁşÀ¸5‘DÎöAu;¨í@[<‘HO.y³Ÿ@ZÃs™	„æÓ¶A™O\0ÊòœÊ´§ĞIîZ{Óà0ÄøçrÔ’Ç¡DP°'ìô©ıOÄvß\nœøB?iòÎè¬@#[HƒBé!~P>x!uøEø.\0¤à(wIE1EÏİÜ /è\":\rĞu|T Kyç8[N ?¡xgPÁ!õ‚ç;uÃNBTúÎƒ\0/jq2hd@1\r /X¨ˆ6v„PÕÉ”7=€ÇD\nÏ¶Š¡ƒâ\"‡E\0‘PPä¢¥§Æ6 ÜQjŒÓ™£ÏH”¤1Ù¾MüSâ¼ğå3è\r³I¬ÒæØêZ:Í,(/Lsà.ñBY§èX#8ZRÄÃHÊ„I<Äé%–Ùó‰ˆ¢5¶ğN¢w\rÓÂÀ[¸ı>-UO¡bãGóÉBEÉº™ijA†8¤¼8qÌDÀ /jRÄ‰q†JÒ\$—*yı‡àœAhµ-ôó‰T¦ébV!ã®i4Ç\\Æë%€˜Àî7’Z9Ø¸†1Ì§LÖ éağ!OkHfD‹Mp96DáÂéP:ix§‘ÍäSBºàL“Ii¼TAPä¹Ï˜^0´S µaf/‘Ï”P0ÍN)\"¡d¹J9‹±c17\rÙoH| àÈ™ÉóÍ¨âŠ2T~Q¥ˆ'ØUÙaR„Ğ÷ì´9³Ë¼¡zp—Qä Â@ËJ4/°7õ(“'Š#’‡T”…\0]KSS»M ‡¨Ap5¼‚H0!ä›Â´ed@RÒÕ ¸µZ†b…ÀÄô 6*†‰\$c‘]\0zÌÀÑ!:J­(£¢ªUDÄ ¯\0Dğ(P	.%•ƒDŠ°½cOCaaªÆ·¢ºm{`eúıÈæ¿£üî°õeUmb‘¤_@ÿ§“’©=`4/„=VM©®.ÊÍy¨,é‹ÙY¤yJZÃ.ÖœvMbªú›GƒY41VV±`]82ş5ó;Öju¸ce“_YŠ¬•¹\$Enë¿šàVpE)H›\$R6Æ²‘1½_Ë6D¬_`øàIi”e+’úIãŒ”ùÆ—©…‰O3„Ê€Lç¤…î§	„s’Ìb!½”ÙÇˆ™a¢‘ĞÅ§i\$.÷’ò¨@Î8È2œi0ÒOÛvêÎ›jb¤¡%Ué‘YÒ!`Ÿq¶##°ˆñâ˜\$ã	 ™ˆ£\"@dh¯©aˆLKv¯Øp u:¦	HÈMT1@5|ék©U	İ¥cjvœ.€RùKá¢A„ô¹òa6Út\0æy€0	 K(\0¤Vµ`\n8júãÀø‹ŠöÊVT“yËü3O\0¡5³w)°ëî°ÔÁ0¬ª`l	9Â4-; S«±¢“Ódâ€¤(h% x\"HC·K°? v8KGPÂ Q\0ù`qÀá#…P)iá\nºH%„Ç©ÂzVci‹Ä(DV>QÓ°Šoc{!§è\r–;Q½†O`ÒD'¤x)é›½£Ë~,@)}X¶{?ãG‚uÑ¼„Ò§ˆ.™âlçd¢FÙ5=aº³½~×œ¤\0000©	êÀ(µ@&Ç`À69ÏöÓ¶u’DQd³ÂÚáf6xX@Å–-0 €¤§îEwèä­Ğ3‹0®Ø\0'	ğRš'à.J˜ÊˆT¢ï˜ÜX1e©°€Š&4ì6ª˜’¡òĞf@|O`b³¨gyq‹†ãÂ\0][^Òj&¶Ÿ Ue°Dˆ/‹’>¢ÄûÊ¤@3†a¬\rø·…–I©Í€¼â\06x¦Ò—ä\\Q–S´¥°–©tjS\$ã_SçT•Rd¨!NæZæ_İ\$qâ´®°™›P¹Œ¿²!•N„°=KJ@dG íîÏ!c9„±×P-Ô˜-uZò¹¢“d…:æòÙ€°a]ÃŒîá\0†UGáU ,ºø/´àµÌRì±…»Ñ„€OwË©,–ğşºÁy%½u¸äŞÙ—]¼Uã\$aÙY \$H…“e«Tx¾à ŞPÇjW¼½ÜXkv[İ0n­Œ•ì™æ-Â­a¾!«!h,šÅç¡T0ˆTD\0ƒ_\nù„˜Õòo—*òLF9·b[ÌÌXU_N\nˆ«z¯\rì³vÔ n˜HÀÄÕ	9¸x%‚14—İOPªí¢e,1×G¸vjœ–ü—rG›ù.î\$q76ÎG]ƒ.3€«Ç…­:C»­ó”Ü2,ÙÄë€^Læ‹İ‹Ì0ƒ˜À{İ°%‚:µ~ÓcÁ3p0Qw6ÄÊ88¡½—ÈÉÚİM\"gKWbĞô}Ñ•’`\rà_«ŞÃãƒ2—1­\"h_)ºøÒ&HˆW»“‚€î‘óc³‘¨2BHÃ+‰”QRï¤bò§Cw˜Ht¨[vİ# g¥ÃãMÁ~¥Tpì×l~yÚjq€5”Õ5Ì[èãÏÎzØĞ¬6üxs»%gÙ&\0¨eV\\oêó¨½š“¼zA¿°X 7‚ó	©|‘9+â˜a-b—ë„IeØºëõ\$,ğ•Bq1ÚŠ˜h–=¸õpˆûLYàŞ\r -hÉogÚ0Á m¡H#‹šö’qFà!±z±`=Av«4W˜¹sP@d<K“J1”,‚,˜Y™]wCH¡Çƒ„…òUáU¶Â–'XÆÜ	ĞíÀe)‡OÕËÇ_%©q(oH»(£šºïr¾kÒ\0*o¥âP¿x05%pëê´ŸÀÔ¾|lÛŒ\r×A™×ÃÚş„Òáàu¸ˆg2PìYzáy!¸uÄ“q,d}çâÆè»jüÜgãxV iŞ;H—dŒšE¸¬NRRÓ”‹ŠV‡t°w;º¹R?%ˆÆOíäÀeXö)´5Šëä¥ØÜ?ÂÇ°@~=ÂIâRæ™esR&rÑqÕ¨X<¨ş¿‘7OzÉ³w®’€wƒ®R™JGX÷Äí( ÂXë£ú[/%ì(ÅPÒ\0É&\"»¤¾dÚ‘B0ş€´ .ê[\$ì`ÃÃ(¡U¥+‹åš0<B\"”T¿êe)/˜{Ïf´ÙòØ>´™³_UŒ„×š’Ô¢Ìy3+LÁúHD'XLƒq…ÿæÜ¾L®ÍNr‹òe<œs9ĞÓÍùNÒk@¤\0£39›Ìí³?‡ -Ù€ÑéGÍ¤@Ú”HõùøÅ/vukê«,Èã&nòÏÄˆü>f§î=.tÒÿg¡æT?Å0?†ñ¥q?‘8¢^SêQßæ)”ä[œ„Øê£uÜCò¢`Ä`™nË\r(PS-à+èÍôpbªéyº\0Ã–\nps‚´z1øSÄı0+`ÜK¹Ëà[ñÙ³;ŒD »\r(ùH1eQ‘‘Š²áAAÉA}—İÀH‚ƒÕõÀN9!rSEgÑmÜp7ƒ°;ÂÛĞ!FË,4¸ã‘‰ÏBµNĞ²åş\"„‘ÉŞ!HşÒ)f‹/ Ç®AñGğÈ\0àİ}V!UºlÄ(ZÀu§M5Å#M«~Ô\0íõ¨ıEâQáñÔ(õ ¥Ó£!ù‡.S@r×œwËÙ°Õ1]}ïñP6 0DPÊÅašòÔ| U¸™eP@m‰ÓLŞÙ}¬/ÍÉhJ¯ƒ/ÇI\\7¯Ë´æJ§¹ÁğÓŸï?wòà=\0’ /tXTç‘< <Ú‘Ó'}aªõ©r}kÏg['jtÉ+l¼Ô¡G„±ÒAÖÑ{µ¸Âûcë¤\rºëÎ¹3Úl”×ÈD9ë×ØØØèƒïKÉB%\\Ñ—VÉ¿ÍÖpÒ<üg¨‡K¶8AÊ!wV»iÓ:5L–±œª_LRçç˜c9¾ty¬³îì‚óééqğ‰#q L„HÆöª0Î\0C­ø}=1úÁ.×P»õÚÜ\rs>[aj>Øh@F6-’@ì¾§û2(>Í@Y³zMèğ\rë©§ ÎHğ>N¨bÀctrn¬èx‡?X%%¼vz@Ç{:0l\\€yÏŞ¾6„ta]ë7—Ÿ0àÊ.İ¥L‚C¦îÚvÍö,fÑ&À%DÛşÛB0ò§8ì§a»u¸XGk?ı¥íïfZNîÍî‡®]·îù,^q\\­Ä!€»ÍjŸfª^0â@ìÛÂf`µ±ÃC­YãÏ`*zã¶[°on%Âj	šnzAÌõò†íĞ^FV•\$GÒkÓ€]ykÓgéîÕĞoÍ7ˆ69êWwºœY‰`.àÑ`ìò{×IP•Ü!„&	ÕTè![«\n#™l™™‰ZîåF”œ‹„=aìidÈ›Şßv•S,p7!˜{[óBª¹TÍ†Ë¤o„“\n›N\\Åk­A;\0°\"yP3µ£Ğ.œNùXP¡ÀT(nÁT#“—±ğFõ¼o‚\"!0Ğ¸û“FÅAÉ˜‚Cƒš#éJ?áÿ—t[·çºòD²ñï÷.<O k'kBOp„#º\$ËNäÇ†Ğñ(ª´˜n¸ïd\$ì§f\0œ„U%^ç‚¼–H§ê®Òqu6EÌZ=¡PÑÃñ»yı«¤Pön€~G»`†px(C9ş-€¯ ô	jLæPLÄr„bxjxñB)İñoäÉ«è\nøø”ŒoÕ:UßÆş‡(])o¿“šWÊ;Ìo‘ )•ÏL&v\njz†Li1™Ò@¡/fönàØ¬+Ÿ1”–c÷\"PâÇDdc30:ŒlTA_nSfÆv¨Ğ´¸@ãÕFì¸æzì€ÜK(Ğ\0¼\n@AsZÀùe&³îÔ1v4_q\nöõºT×áWš³Â)=Qy”‡z„‡›eáâ·ÚÈ’FpÑ§œç™9×=H«Š#™.Ü¯?Â\rÏ2'îmCwA€İ xyé‘òö•Ô°tÍ—…Ç…üœg9zqß›¯°ô]–][-÷Óšæ^kúì±M¶\"ğRêÍa,EÃ’	2«®ã…Es5ë¦Á¸);÷9]Ê”z™õ ,Õ¿>öc!ĞŠgy}êFXõ “ s2ÖıJˆk¥GVß™fàe†Q(_áFç%,«/û-òãĞ:>×'\nöÑË qÑ‡†Àñ-@uC¹Cä¢`-!/Bà 6Gè@aPG«4Y+ÑFLi7.ı#dîû_”Ä‡²ı6Ö\0	Î`ƒ˜M^ØI#ÙJ44û;~B¤ı¢‰Œî!(‘ìÑsâN©LétÙgOÆZµ‚	’L¢smĞ;ŞÂi‡°İ–\0°cY—fMv0ø%ıì€­{%,DRC1,ºåÚJ{7P*YXc8ŸıĞ{n4Ÿ%®v‰nJ/j3OÚ¤å—Šßå‰J~k\$¶ÊZJfèùõèî„läÑd°%ß´#î¿vRØ(®î@¿½ûßw—kjWÛ’ï¢=µ9#G{v[i…&“±bèw/¹˜˜‘²Ÿ?eãr{’ÈÆ÷¦¼®J19á>Åö¸Ò,înFµ‡^§ssÃ–„/w‰³,_RÄ2»y¶s²u+ÄªèP=ø?‡I¾t-.ôo\\lLf^we;wP¢p»Y…óoÁb_€Ôì°Ö¢èò'ğ0îçà”?¡ÔBxRGÌFƒÊG‰é¦øbïŸİÒ¾,.Ş‹!j\$Wx8h¾ÔæÃÄoIÁ€D' XXùšç/¤‡Ëk¾ıš„5¸§CÇšzÏÓØ‰`á‰1°^IWr³ÊÔè^³Vìå…’Œ»f	Ô-şÎÃR’Ò“şíĞ·Í¬~çÎi;Å†.âßÈ;ËèJWë?à”;ùk3ùµ,gy™G’Ì×œ±™õá\rÓ	\r#£Ÿsº¾¥©û´–Ú°İˆ+%µë£úÀŞí–\n4ƒd|Û2.ûÖ»Êkh1#+èL\räi(Ø@Pê¨Y‹¨ØUf˜MlŒ¨±€È 3r¾e(è\r‹*¢;¡_îçZûÁ×®÷ŸN}êŸ{’¤_65)%ÃT¢KâÃm\0P\nğ«ñoˆ„Í_Â«yB\"ñÒ5}|¹Ï=RÊ¾L3”YX­ioÅ%E¿<åÿ+Ä9E\$`×üè4áÍ9š£]\nˆ¡˜:ø›rO`BW`£Ò ±,i…YP+¦nÆúrFÔŞ=—¿JIöl}‹ä\"µ:ıÆSûã<*¬øeË]M™îQf¡|”®Tv³JkB`¨†Ü¡—/:/æE…Wàs· hîÚ{RÀjœ}éôòW\n [EÒÀ<\0°7	ryÇN8ïªY3ËMºÿÒˆ\$€3{¨SJt¼é)jq‚ÜÍJËÎÀ\$n#×ı µBHŸÛö?…ğP…t¿<;\0000ßUp@ºN\r\\úß¯ì–á< ­¿z†ÍÉÚˆ€myİŒV«`:[?Û«‰T4¢Y\$4âç|øMÈoVô–Hİíïù“îŸñúMdma¾hÙb0Í!S^Oèë¤:§ÆtÉEù`™¢Š…5\0000Q°Šv2æ@11* _\$1P¡[¾]p		¤Œ,Ğ‡uşÂù9 p @P²„â¸¤ş#ûg¬x;á`€zy“âA@E\0¢è /ês€ˆ£Ú!*ÀDLhàÏÿ´êAĞ³`?¨¤Gú€ĞÙXêªy„] \$I9@¦ì\n`…\0€r>d8'cQ¿ĞÒ‰‡ù=èò3\0OAT0) Ã´\0µc˜°-ºÿä	Ğ1w!`@Î‰J0	 &Â7ÀÚPÜÍ@ä ,€:A¼‹m2ÿhFS%èÿ`\\†‹5\0_PÀ&5´ A]\"Ğ0#9_ 6'jAY¬Nš¿ÑSĞT”23„f¯¿È4™«è0Á{t 8?Èÿ¬âù@˜Q9D°µ2E°b´IØ?ÃRš¾}¸kğGƒùP7\0ì*òNAÓ .ì(7ÇÜ@8!KYı¦ÔcÔv\\°Àñ’NEOAĞL\ná—¡ØdpbÁõcO÷4¬Ê¿\r\0¿Õ›uCÀ§—atÂ §ÈM¿¢èÒ\n\$ı:h2•.¢@}¯Ë8`â·ÊÈ+‚0Ä“7¦H+£—l ¨?ìğ¿®ıø¯ñ‡`*”&à:?² hv\0¸ÂLş„%Ib5F¤¢l¥QBXÑ%í<¤XFA@4\\‹0‘	À*°P B¼Mhğ®Â¾\0ápªB\0©i	‘‹‰+@¸B¹\nü,±B¼\nËo„!bøQ×/y	¨\$ÓUëš ¼šS{ã‡b¡N&”‹ypÃ¢HÑØÀ³:äbï:P„—¾Qù'Aˆ€Ä…Ä2 \0fy¼kä€k€†€àH[-?8‚ûÄé¯ˆT¸/a\rLCÉbe›:¼¬)8:bú30šòCÌ/“\rBk\0°81v€CDkØa/’ŞÂù!N/’‰Jd&\r(¤\"5A©©aĞÓ,xü0!Kä¹Üè#/B\\rU¡[cE†ğ_Àqã@ƒpiŸˆ/\"„‚ ‚ˆ¢HÓ`péÁúşñaáÅ{ø€‚8#iSÉ×6ä9ÃLFH©Ô¦5)UN)€¸ /»\\BQ3\0Ê¡ÊCôÒ”°şˆgø\rİD	È´£ÊD\r\r˜ğé¸¤à\r\0DbäA„e‘‡[q‘‡©[( =è(ĞÖ¯†GùÓCF\"8¼PáÃR%ÊBÃƒCn73´â‚¥\\•—â5C–	t9PÓ78c\0ˆ\r@<7mÎ·FªŸ®ZÃ¢èiÉ‚‚");}elseif($_GET["file"]=="jush.js"){header("Content-Type: text/javascript; charset=utf-8");echo
lzw_decompress("v0œF£©ÌĞ==˜ÎFS	ĞÊ_6MÆ³˜èèr:™E‡CI´Êo:C„”Xc‚\ræØ„J(:=ŸE†¦a28¡xğ¸?Ä'ƒi°SANN‘ùğxs…NBáÌVl0›ŒçS	œËUl(D|Ò„çÊP¦À>šE†ã©¶yHchäÂ-3Eb“å ¸b½ßpEÁpÿ9.Š˜Ì~\n?Kb±iw|È`Ç÷d.¼x8EN¦ã!”Í2™‡3©ˆá\r‡ÑYÌèy6GFmY8o7\n\r³0¤÷\0DbcÓ!¾Q7Ğ¨d8‹Áì~‘¬N)ùEĞ³`ôNsßğ`ÆS)ĞOé—·ç/º<xÆ9o»ÔåµÁì3n«®2»!r¼:;ã+Â9ˆCÈ¨®‰Ã\n<ñ`Èó¯bè\\š?`†4\r#`È<¯BeãB#¤N Üã\r.D`¬«jê4ÿpéar°øã¢º÷>ò8Ó\$Éc ¾1Écœ ¡c êİê{n7ÀÃ¡ƒAğNÊRLi\r1À¾ø!£(æjÂ´®+Âê62ÀXÊ8+Êâàä.\rÍÎôƒÎ!x¼åƒhù'ãâˆ6Sğ\0RïÔôñOÒ\n¼…1(W0…ãœÇ7qœë:NÃE:68n+äÕ´5_(®s \rã”ê‰/m6PÔ@ÃEQàÄ9\n¨V-‹Áó\"¦.:åJÏ8weÎq½|Ø‡³XĞ]µİY XÁeåzWâü 7âûZ1íhQfÙãu£jÑ4Z{p\\AUËJ<õ†káÁ@¼ÉÃà@„}&„ˆL7U°wuYhÔ2¸È@ûu  Pà7ËA†hèÌò°Ş3Ã›êçXEÍ…Zˆ]­lá@MplvÂ)æ ÁÁHW‘‘Ôy>Y-øYŸè/«›ªÁî hC [*‹ûFã­#~†!Ğ`ô\r#0PïCË—f ·¶¡îÃ\\î›¶‡É^Ã%B<\\½fˆŞ±ÅáĞİã&/¦O‚ğL\\jF¨jZ£1«\\:Æ´>N¹¯XaFÃAÀ³²ğÃØÍf…h{\"s\n×64‡ÜøÒ…¼?Ä8Ü^p\"ë°ñÈ¸\\Úe(¸PƒNµìq[g¸Árÿ&Â}PhÊà¡ÀWÙí*Şír_sËP‡hà¼àĞ\nÛËÃomõ¿¥Ãê—Ó#§¡.Á\0@épdW ²\$Òº°QÛ½Tl0† ¾ÃHdHë)š‡ÛÙÀ)PÓÜØHgàıUş„ªBèe\r†t:‡Õ\0)\"Åtô,´œ’ÛÇ[(DøO\nR8!†Æ¬ÖšğÜlAüV…¨4 hà£Sq<à@}ÃëÊgK±]®àè]â=90°'€åâøwA<‚ƒĞÑaÁ~€òWšæƒD|A´††2ÓXÙU2àéyÅŠŠ=¡p)«\0P	˜s€µn…3îr„f\0¢F…·ºvÒÌG®ÁI@é%¤”Ÿ+Àö_I`¶ÌôÅ\r.ƒ N²ºËKI…[”Ê–SJò©¾aUf›Szûƒ«M§ô„%¬·\"Q|9€¨Bc§aÁq\0©8Ÿ#Ò<a„³:z1Ufª·>îZ¹l‰‰¹ÓÀe5#U@iUGÂ‚™©n¨%Ò°s¦„Ë;gxL´pPš?BçŒÊQ\\—b„ÿé¾’Q„=7:¸¯İ¡Qº\r:ƒtì¥:y(Å ×\nÛd)¹ĞÒ\nÁX; ‹ìêCaA¬\ráİñŸP¨GHù!¡ ¢@È9\n\nAl~H úªV\nsªÉÕ«Æ¯ÕbBr£ªö„’­²ßû3ƒ\rP¿%¢Ñ„\r}b/‰Î‘\$“5§PëCä\"wÌB_çÉUÕgAtë¤ô…å¤…é^QÄåUÉÄÖj™Áí Bvhì¡„4‡)¹ã+ª)<–j^<Lóà4U* õBg ëĞæè*nÊ–è-ÿÜõÓ	9O\$´‰Ø·zyM™3„\\9Üè˜.oŠ¶šÌë¸E(iåàœÄÓ7	tßšé-&¢\nj!\rÀyœyàD1gğÒö]«ÜyRÔ7\"ğæ§·ƒˆ~ÀíàÜ)TZ0E9MåYZtXe!İf†@ç{È¬yl	8‡;¦ƒR{„ë8‡Ä®ÁeØ+ULñ'‚F²1ıøæ8PE5-	Ğ_!Ô7…ó [2‰JËÁ;‡HR²éÇ¹€8pç—²İ‡@™£0,Õ®psK0\r¿4”¢\$sJ¾Ã4ÉDZ©ÕI¢™'\$cL”R–MpY&ü½Íiçz3GÍzÒšJ%ÁÌPÜ-„[É/xç³T¾{p¶§z‹CÖvµ¥Ó:ƒV'\\–’KJa¨ÃMƒ&º°£Ó¾\"à²eo^Q+h^âĞiTğ1ªORäl«,5[İ˜\$¹·)¬ôjLÆU`£SË`Z^ğ|€‡r½=Ğ÷nç™»–˜TU	1Hyk›Çt+\0váD¿\r	<œàÆ™ìñjG”­tÆ*3%k›YÜ²T*İ|\"CŠülhE§(È\rÃ8r‡×{Üñ0å²×şÙDÜ_Œ‡.6Ğ¸è;ãü‡„rBjƒO'Ûœ¥¥Ï>\$¤Ô`^6™Ì9‘#¸¨§æ4Xş¥mh8:êûc‹ş0ø×;Ø/Ô‰·¿¹Ø;ä\\'( î„tú'+™òı¯Ì·°^]­±NÑv¹ç#Ç,ëvğ×ÃOÏiÏ–©>·Ş<SïA\\€\\îµü!Ø3*tl`÷u\0p'è7…Pà9·bsœ{Àv®{·ü7ˆ\"{ÛÆrîaÖ(¿^æ¼İE÷úÿë¹gÒÜ/¡øUÄ9g¶î÷/ÈÔ`Ä\nL\n)À†‚(Aúağ\" çØ	Á&„PøÂ@O\nå¸«0†(M&©FJ'Ú! …0Š<ïHëîÂçÆù¥*Ì|ìÆ*çOZím*n/bî/ö®Ôˆ¹.ìâ©o\0ÎÊdnÎ)ùi:RÎëP2êmµ\0/vìOX÷ğøFÊ³ÏˆîŒè®\"ñ®êöî¸÷0õ0ö‚¬©í0bËĞgjğğ\$ñné0}°	î@ø=MÆ‚0nîPŸ/pæotì€÷°¨ğ.ÌÌ½g\0Ğ)o—\n0È÷‰\rF¶é€ b¾i¶Ão}\n°Ì¯…	NQ°'ğxòFaĞJîÎôLõéğĞàÆ\rÀÍ\r€Öö‘0Åñ'ğ¬Éd	oepİ°4DĞÜÊ¦q(~ÀÌ ê\r‚E°ÛprùQVFHœl£‚Kj¦¿äN&­j!ÍH`‚_bh\r1 ºn!ÍÉ­z™°¡ğ¥Í\\«¬\rŠíŠÃ`V_kÚÃ\"\\×‚'Vˆ«\0Ê¾`ACúÀ±Ï…¦VÆ`\r%¢’ÂÅì¦\rñâƒ‚k@NÀ°üBñíš™¯ ·!È\n’\0Z™6°\$d Œ,%à%laíH×\n‹#¢S\$!\$@¶İ2±„I\$r€{!±°J‡2HàZM\\ÉÇhb,‡'||cj~gĞr…`¼Ä¼º\$ºÄÂ+êA1ğœE€ÇÀÙ <ÊL¨Ñ\$âY%-FDªŠd€Lç„³ ª\n@’bVfè¾;2_(ëôLÄĞ¿Â²<%@Úœ,\"êdÄÀN‚erô\0æƒ`Ä¤Z€¾4Å'ld9-ò#`äóÅ–…à¶Öãj6ëÆ£ãv ¶àNÕÍf Ö@Ü†“&’B\$å¶(ğZ&„ßó278I à¿àP\rk\\§—2`¶\rdLb@Eöƒ2`P( B'ã€¶€º0²& ô{Â•“§:®ªdBå1ò^Ø‰*\r\0c<K|İ5sZ¾`ºÀÀO3ê5=@å5ÀC>@ÂW*	=\0N<g¿6s67Sm7u?	{<&LÂ.3~DÄê\rÅš¯x¹í),rîinÅ/ åO\0o{0kÎ]3>m‹”1\0”I@Ô9T34+Ô™@e”GFMCÉ\rE3ËEtm!Û#1ÁD @‚H(‘Ón ÃÆ<g,V`R]@úÂÇÉ3Cr7s~ÅGIói@\0vÂÓ5\rVß'¬ ¤ Î£PÀÔ\râ\$<bĞ%(‡Ddƒ‹PWÄîĞÌbØfO æx\0è} Üâ”lb &‰vj4µLS¼¨Ö´Ô¶5&dsF Mó4ÌÓ\".HËM0ó1uL³\"ÂÂ/J`ò{Çş§€ÊxÇYu*\"U.I53Q­3Qô»J„”g ’5…sàú&jÑŒ’Õu‚Ù­ĞªGQMTmGBƒtl-cù*±ş\rŠ«Z7Ôõó*hs/RUV·ğôªBŸNËˆ¸ÃóãêÔŠài¨Lk÷.©´Ätì é¾©…rYi”Õé-Sµƒ3Í\\šTëOM^­G>‘ZQjÔ‡™\"¤¬i”ÖMsSãS\$Ib	f²âÑuæ¦´™å:êSB|i¢ YÂ¦ƒà8	vÊ#é”Dª4`‡†.€Ë^óHÅM‰_Õ¼ŠuÀ™UÊz`ZJ	eçºİ@Ceíëa‰\"mób„6Ô¯JRÂÖ‘T?Ô£XMZÜÍĞ†ÍòpèÒ¶ªQv¯jÿjV¶{¶¼ÅCœ\rµÕ7‰TÊª úí5{Pö¿]’\rÓ?QàAAÀè‹’Í2ñ¾ “V)Ji£Ü-N99f–l JmÍò;u¨@‚<FşÑ ¾e†j€ÒÄ¦I‰<+CW@ğçÀ¿Z‘lÑ1É<2ÅiFı7`KG˜~L&+NàYtWHé£‘w	Ö•ƒòl€Òs'gÉãq+Lézbiz«ÆÊÅ¢Ğ.ĞŠÇzW²Ç ùzd•W¦Û÷¹(y)vİE4,\0Ô\"d¢¤\$Bã{²!)1U†5bp#Å}m=×È@ˆwÄ	P\0ä\rì¢·‘€`O|ëÆö	œÉüÅõûYôæJÕ‚öE×ÙOu_§\n`F`È}MÂ.#1á‚¬fì*´Õ¡µ§  ¿zàucû€—³ xfÓ8kZR¯s2Ê‚-†’§Z2­+Ê·¯(åsUõcDòÑ·Êì˜İX!àÍuø&-vPĞØ±\0'LïŒX øLÃ¹Œˆo	İô>¸ÕÓ\r@ÙPõ\rxF×üE€ÌÈ­ï%Àãì®ü=5NÖœƒ¸?„7ùNËÃ…©wŠ`ØhX«98 Ìø¯q¬£zãÏd%6Ì‚tÍ/…•˜ä¬ëLúÍl¾Ê,ÜKa•N~ÏÀÛìú,ÿ'íÇ€M\rf9£w˜!x÷x[ˆÏ‘ØG’8;„xA˜ù-IÌ&5\$–D\$ö¼³%…ØxÑ¬Á”ÈÂ´ÀÂŒ]›¤õ‡&o‰-39ÖLù½zü§y6¹;u¹zZ èÑ8ÿ_•Éx\0D?šX7†™«’y±OY.#3Ÿ8 ™Ç€˜e”Q¨=Ø€*˜™GŒwm ³Ú„Y‘ù ÀÚ]YOY¨F¨íšÙ)„z#\$eŠš)†/Œz?£z;™—Ù¬^ÛúFÒZg¤ù• Ì÷¥™§ƒš`^Úe¡­¦º#§“Øñ”©ú?œ¸e£€M£Ú3uÌåƒ0¹>Ê\"?Ÿö@×—Xv•\"ç”Œ¹¬¦*Ô¢\r6v~‡ÃOV~&×¨^gü šÄ‘Ù‡'Î€f6:-Z~¹šO6;zx²;&!Û+{9M³Ù³d¬ \r,9Öí°ä·WÂÆİ­:ê\rúÙœùã@ç‚+¢·]œÌ-[g™Û‡[s¶[iÙiÈq››y›éxé+“|7Í{7Ë|w³}„¢›£E–ûW°€Wk¸|JØ¶å‰xmˆ¸q xwyjŸ»˜#³˜e¼ø(²©‰¸ÀßÃ¾™†ò³ {èßÚ y“ »M»¸´@«æÉ‚“°Y(gÍš-ÿ©º©äí¡š¡ØJ(¥ü@ó…;…yÂ#S¼‡µY„Èp@Ï%èsúoŸ9;°ê¿ôõ¤¹+¯Ú	¥;«ÁúˆZNÙ¯Âº§„š k¼V§·u‰[ñ¼x…|q’¤ON?€ÉÕ	…`uœ¡6|­|X¹¤­—Ø³|Oìx!ë:¨œÏ—Y]–¬¹™c•¬À\r¹hÍ9nÎÁ¬¬ë€Ï8'—ù‚êà Æ\rS.1¿¢USÈ¸…¼X‰É+ËÉz]ÉµÊ¤?œ©ÊÀCË\r×Ë\\º­¹ø\$Ï`ùÌ)UÌ|Ë¤|Ñ¨x'ÕœØÌäÊ<àÌ™eÎ|êÍ³ç—â’Ìé—LïÏİMÎy€(Û§ĞlĞº¤O]{Ñ¾×FD®ÕÙ}¡yu‹ÑÄ’ß,XL\\ÆxÆÈ;U×ÉWt€vŸÄ\\OxWJ9È’×R5·WiMi[‡Kˆ€f(\0æ¾dÄšÒè¿©´\rìMÄáÈÙ7¿;ÈÃÆóÒñçÓ6‰KÊ¦Iª\rÄÜÃxv\r²V3ÕÛßÉ±.ÌàRùÂşÉá|Ÿá¾^2‰^0ß¾\$ QÍä[ã¿D÷áÜ£å>1'^X~t1\"6Lş›+ş¾Aàeá“æŞåI‘ç~Ÿåâ³â³@ßÕ­õpM>Óm<´ÒSKÊç-HÉÀ¼T76ÙSMfg¨=»ÅGPÊ°›PÖ\r¸é>Íö¾¡¥2Sb\$•C[Ø×ï(Ä)Ş%Q#G`uğ°ÇGwp\rkŞKe—zhjÓ“zi(ôèrO«óÄŞÓşØT=·7³òî~ÿ4\"ef›~íd™ôíVÿZ‰š÷U•-ëb'VµJ¹Z7ÛöÂ)T‘£8.<¿RMÿ\$‰ôÛØ'ßbyï\n5øƒİõ_àwñÎ°íUğ’`eiŞ¿J”b©gğuSÍë?Íå`öáì+¾Ïï Mïgè7`ùïí\0¢_Ô-ûŸõ_÷–?õF°\0“õ¸X‚å´’[²¯Jœ8&~D#Áö{P•Øô4Ü—½ù\"›\0ÌÀ€‹ı§ı@Ò“–¥\0F ?* ^ñï¹å¯wëĞ:ğ¾uàÏ3xKÍ^ów“¼¨ß¯‰y[Ô(æ–µ#¦/zr_”g·æ?¾\0?€1wMR&M¿†ù?¬St€T]İ´Gõ:I·à¢÷ˆ)‡©Bïˆ‹ vô§’½1ç<ôtÈâ6½:W{ÀŠôx:=Èî‘ƒŒŞšóø:Â!!\0x›Õ˜£÷q&áè0}z\"]ÄŞo•z¥™ÒjÃw×ßÊÚÁ6¸ÒJ¢PÛ[\\ }ûª`S™\0à¤qHMë/7B’€P°ÂÄ]FTã•8S5±/IÑ\rŒ\n îO¯0aQ\n >Ã2­j…;=Ú¬ÛdA=­p£VL)Xõ\nÂ¦`e\$˜TÆ¦QJÎk´7ª*Oë .‰ˆ…òÄ¡\röµš\$#pİWT>!ªªv|¿¢}ë× .%˜Á,;¨ê›å…­Úf*?«ç„˜ïô„\0¸ÄpD›¸! ¶õ#:MRcúèB/06©­®	7@\0V¹vg€ ØÄhZ\nR\"@®ÈF	‘Êä¼+Êš°EŸIŞ\n8&2ÒbXşPÄ¬€Í¤=h[§¥æ+ÕÊ‰\r:ÄÍFû\0:*åŞ\r}#úˆ!\"¤c;hÅ¦/0ƒ·Ş’òEj®íÁ‚Î]ñZ’ˆ‘—\0Ú@iW_–”®h›;ŒVRb°ÚP%!­ìb]SBšƒ’õUl	åâ³érˆÜ\rÀ-\0 À\"Q=ÀIhÒÍ€´	 F‘ùşLèÎFxR‚Ñ@œ\0*Æj5Œük\0Ï0'	@El€O˜ÚÆH CxÜ@\"G41Ä`Ï¼P(G91«\0„ğ\"f:QÊ¸@¨`'>7ÑÈädÀ¨ˆíÇR41ç>ÌrIHõGt\n€RH	ÀÄbÒ€¶71»ìfãh)Dª„8 B`À†°(V<Q§8c? 2€´€E4j\0œ9¼\r‚Íÿ@‹\0'FúDš¢,Å!ÓÿH=Ò* ˆEí(×ÆÆ?Ñª&xd_H÷Ç¢E²6Ä~£uÈßG\0RXıÀZ~P'U=Çß @èÏÈl+A­\n„h£IiÆ”ü±ŸPG€Z`\$ÈP‡ş‘À¤Ù.Ş;ÀEÀ\0‚}€ §¸Q±¤“äÓ%èÑÉjA’W’Ø¥\$»!ıÉ3r1‘ {Ó‰%i=IfK”!Œe\$àé8Ê0!üh#\\¹HF|Œi8tl\$ƒğÊlÀìläi*(ïG¸ñçL	 ß\$€—xØ.èq\"Wzs{8d`&ğWô©\0&E´¯Íì15jWäb¬öÄ‡ÊŞV©R„³™¿-#{\0ŠXi¤²Äg*÷š7ÒVF3‹`å¦©p@õÅ#7°	å†0€æ[Ò®–¬¸[øÃ©hË–\\áo{ÈáŞT­ÊÒ]²ï—Œ¼Å¦á‘€8l`f@—reh·¥\nÊŞW2Å*@\0€`K(©L•Ì·\0vTƒË\0åc'L¯ŠÀ:„” 0˜¼@L1×T0b¢àhşWÌ|\\É-èïÏDN‡ó€\ns3ÀÚ\"°€¥°`Ç¢ùè‚’2ªå€&¾ˆ\rœU+™^ÌèR‰eS‹n›i0ÙuËšb	J˜’€¹2s¹Ípƒs^n<¸¥òâ™±Fl°aØ\0¸š´\0’mA2›`|ØŸ6	‡¦nrÁ›¨\0DÙ¼Íì7Ë&mÜß§-)¸ÊÚ\\©ÆäİŒ\n=â¤–à;* ‚Şb„è“ˆÄT“‚y7cú|o /–Ôßß:‹ît¡P<ÙÀY: K¸&C´ì'G/Å@ÎàQ *›8çv’/‡À&¼üòWí6p.\0ªu3«ŒñBq:(eOPáp	”é§²üÙã\rœ‹á0(ac>ºNö|£º	“t¹Ó\n6vÀ_„îeİ;yÕÎè6fügQ;yúÎ²[Sø	äëgöÇ°èO’ud¡dH€Hğ= Z\ræ'ÚÊùqC*€) œîgÂÇEêO’€ \" ğ¨!kĞ('€`Ÿ\nkhTùÄ*ösˆÄ5R¤Eöa\n#Ö!1¡œ¿‰×\0¡;ÆÇSÂiÈ¼@(àl¦Á¸I× Ìv\rœnj~ØçŠ63¿ÎˆôI:h°ÔÂƒ\n.‰«2plÄ9Btâ0\$bº†p+”Ç€*‹tJ¢ğÌ¾s†JQ8;4P(ı†Ò§Ñ¶!’€.Ppk@©)6¶5ı”!µ(ø“\n+¦Ø{`=£¸H,É\\Ñ´€4ƒ\"[²Cø»º1“´Œ-èÌluoµä¸4•[™±â…EÊ%‡\"‹ôw] Ù(ã ÊTe¢)êK´A“E={ \n·`;?İôœ-ÀGŠ5I¡í­Ò.%Á¥²şéq%EŸ—ıs¢é©gFˆ¹s	‰¦¸ŠKºGÑøn4i/,­i0·uèx)73ŒSzgŒâÁV[¢¯hãDp'ÑL<TM¤äjP*oœâ‰´‘\nHÎÚÅ\n 4¨M-W÷NÊA/î†@¤8mH¢‚Rp€tp„V”=h*0ºÁ	¥1;\0uG‘ÊT6’@s™\0)ô6À–Æ£T\\…(\"èÅU,ò•C:‹¥5iÉKšl«ì‚Û§¡E*Œ\"êrà¦ÔÎ.@jRâJ–QîŒÕ/¨½L@ÓSZ”‘¥Põ)(jjJ¨««ªİL*ª¯Ä\0§ªÛ\r¢-ˆñQ*„QÚœgª9é~P@…ÕÔH³‘¬\n-e»\0êQw%^ ETø< 2Hş@Ş´îe¥\0ğ e#;öÖI‚T’l“¤İ+A+C*’YŒ¢ªh/øD\\ğ£!é¬š8“Â»3AĞ™ÄĞEğÍE¦/}0tµJ|™Àİ1Qm«Øn%(¬p´ë!\nÈÑÂ±UË)\rsEXú‚’5u%B- ´Àw]¡*•»E¢)<+¾¦qyV¸@°mFH òÔšBN#ı]ÃYQ1¸Ö:¯ìV#ù\$“æ şô<&ˆX„€¡úÿ…x« tš@]GğíÔ¶¥j)-@—qĞˆL\nc÷I°Y?qC´\ràv(@ØËX\0Ov£<¬Rå3X©µ¬Q¾Jä–Éü9Ö9ÈlxCuÄ«d±± vT²Zkl\rÓJíÀ\\o›&?”o6EĞq °³ªÉĞ\r–÷«'3úËÉª˜J´6ë'Y@È6ÉFZ50‡VÍT²yŠ¬˜C`\0äİVS!ıš‹&Û6”6ÉÑ³rD§f`ê›¨Jvqz„¬àF¿ ÂÂò´@è¸İµ…šÒ…Z.\$kXkJÚ\\ª\"Ë\"àÖi°ê«:ÓEÿµÎ\roXÁ\0>P–¥Pğmi]\0ªöö“µaV¨¸=¿ªÈI6¨´°ÎÓjK3ÚòÔZµQ¦m‰EÄèğbÓ0:Ÿ32ºV4N6³´à‘!÷lë^Ú¦Ù@hµhUĞ>:ú	˜ĞE›>jäèĞú0g´\\|¡Shâ7yÂŞ„\$•†,5aÄ—7&¡ë°:[WX4ÊØqÖ ‹ìJ¹Æä×‚Şc8!°H¸àØVD§Ä­+íDŠ:‘¡¥°9,DUa!±X\$‘ÕĞ¯ÀÚ‹GÁÜŒŠBŠt9-+oÛt”L÷£}Ä­õqK‹‘x6&¯¯%x”ÏtR¿–éğ\"ÕÏ€èR‚IWA`c÷°È}l6€Â~Ä*¸0vkıp«Ü6Àë›8z+¡qúXöäw*·EƒªIN›¶ªå¶ê*qPKFO\0İ,(Ğ€|œ•‘”°k *YF5”åå;“<6´@ØQU—\"×ğ\rbØOAXÃvè÷v¯)H®ôo`STÈpbj1+Å‹¢e²Á™ Ê€Qx8@¡‡ĞÈç5\\Q¦,Œ‡¸Ä‰NëİŞ˜b#Y½H¥¯p1›ÖÊøkB¨8NüoûX3,#UÚ©å'Ä\"†é”€ÂeeH#z›­q^rG[¸—:¿\r¸m‹ngòÜÌ·5½¥V]«ñ-(İWğ¿0âëÑ~kh\\˜„ZŠå`ïél°êÄÜk ‚oÊjõWĞ!€.¯hFŠÔå[tÖA‡wê¿e¥Mà««¡3!¬µÍæ°nK_SF˜j©¿ş-S‚[rœÌ€wä´ø0^Áh„fü-´­ı°?‚›ıXø5—/±©Š€ëëIY ÅV7²a€d ‡8°bq·µbƒn\n1YRÇvT±õ•,ƒ+!Øıü¶NÀT£î2IÃß·ÄÄ÷„ÇòØ‡õ©K`K\"ğ½ô£÷O)\nY­Ú4!}K¢^²êÂàD@á…÷naˆ\$@¦ ƒÆ\$AŠ”jÉËÇø\\‹D[=Ë	bHpùSOAG—ho!F@l„UËİ`Xn\$\\˜Íˆ_†¢Ë˜`¶âHBÅÕ]ª2ü«¢\"z0i1‹\\”ŞÇÂÔwù.…fyŞ»K)£îíÂ‡¸ pÀ0ä¸XÂS>1	*,]’à\r\"ÿ¹<cQ±ñ\$t‹„qœ.‹ü	<ğ¬ñ™+t,©]Lò!È{€güãX¤¶\$¤6v…˜ùÇ ¡š£%GÜHõ–ÄØœÈE ÒXÃÈ*Á‚0ÛŠ)q¡nCØ)I›ûà\"µåÚÅŞíˆ³¬`„KFçÁ’@ïd»5Œê»AÈÉp€{“\\äÓÀpÉ¾Nòrì'£S(+5®ĞŠ+ \"´Ä€£U0ÆiËÜ›úæ!nMˆùbrKÀğä6Ãº¡r–ì¥â¬|aüÊÀˆ@Æx|®²kaÍ9WR4\"?5Ê¬pıÛ“•ñk„rÄ˜«¸¨ıß’ğæ¼7Â—Hp†‹5YpW®¼ØG#ÏrÊ¶AWD+`¬ä=Ê\"ø}Ï@HÑ\\p°“Ğ€©ß‹Ì)C3Í!sO:)Ùè_F/\r4éÀç<A¦…\nn /Tæ3f7P1«6ÓÄÙıOYĞ»Ï²‡¢óqì×;ìØÀæaıXtS<ã¼9Ânws²x@1ÎxsÑ?¬ï3Å@¹…×54„®oÜÈƒ0»ŞĞïpR\0Øà¦„†Îù·óâyqßÕL&S^:ÙÒQğ>\\4OInƒZ“nçòvà3¸3ô+P¨…L(÷Ä”ğ…Àà.x \$àÂ«Cå‡éCnªAkçc:LÙ6¨ÍÂr³w›ÓÌh°½ÙÈnr³Zêã=è»=jÑ’˜³‡6}MŸGıu~3ùšÄbg4Åùôs6sóQé±#:¡3g~v3¼ó€¿<¡+Ï<ô³Òa}Ï§=Îe8£'n)ÓcCÇzÑ‰4L=hıŒ{i´±Jç^~çƒÓwg‹Dà»jLÓéÏ^šœÒÁ=6Î§NÓ”êÅÁ¢\\éÛDóÆÑN”†êEı?hÃ:SÂ*>„ô+¡uúhhÒ…´W›E1j†x²Ÿôí´ŠtÖ'Îtà[ îwS²¸ê·9š¯Tö®[«,ÕjÒv“òÕît£¬A#T™¸Ôæ‚9ìèj‹K-õÒŞ ³¿¨Yèi‹Qe?®£4ÓÓÁë_WzßÎéó‹@JkWYêhÎÖpu®­çj|z4×˜õ	èi˜ğm¢	àO5à\0>ç|ß9É×–«µè½ öëgVyÒÔu´»¨=}gs_ºãÔV¹sÕ®{çk¤@r×^—õÚ(İwÏ…øH'°İaì=i»ÖNÅ4µ¨‹ë_{Ï6ÇtÏ¨ÜöÏ—e [Ğh-¢“Ul?Jîƒ0O\0^ÛHlõ\0.±„Z‚’œ¼âÚxu€æğ\"<	 /7ÁŠ¨Ú û‹ïi:Ò\nÇ ¡´à;íÇ!À3ÚÈÀ_0`\0H`€Â2\0€ŒHò#h€[¶P<í¦†‘×¢g¶Ü§m@~ï(şÕ\0ßµkâY»vÚæâ#>¥ù„\nz\n˜@ÌQñ\n(àGİ\nöüà'kóš¦èº5“n”5Û¨Ø@_`Ğ‡_l€1Üşèwp¿Pî›w›ªŞ\0…cµĞoEl{Åİ¾é7“»¼¶o0ĞÛÂôIbÏên‹zÛÊŞÎï·›¼ ‹ç{Ç8øw=ëîŸ| /yê3aíß¼#xqŸÛØò¿»@ï÷kaà!ÿ\08dîmˆäR[wvÇ‹RGp8øŸ vñ\$Zü½¸mÈûtÜŞİÀ¥·½íôºÜû·Ç½Ôîûu€oİp÷`2ğãm|;#x»mñnç~;ËáVëE£ÂíØğÄü3OŸ\r¸,~o¿w[òáNêø}ºş ›clyá¾ñ¸OÄÍŞñ;…œ?á~ì€^j\"ñWz¼:ß'xWÂŞ.ñ	Áu’(¸ÅÃäq—‹<gâçv¿hWq¿‰\\;ßŸ8¡Ã)M\\³š5vÚ·x=h¦iºb-ÀŞ|bÎğàpyDĞ•Hh\rceà˜y7·p®îxşÜG€@D=ğ Öù§1Œÿ!4Ra\r¥9”!\0'ÊYŒŸ¥@>iS>æ€Ö¦Ÿo°óoòÎfsO 9 .íşéâ\"ĞF‚…ló20åğE!Qšá¦çËD9dÑBW4ƒ›\0û‚y`RoF>FÄa„‰0‘ùÊƒó0	À2ç<‚IÏP'\\ñçÈIÌ\0\$Ÿœ\n R aUĞ.‚sĞ„«æ\"ùš1Ğ†…eºYç ¢„Zêqœñ1 |Ç÷#¯G!±P’P\0|‰HÇFnp>Wü:¢`YP%”ÄâŸ\nÈa8‰ÃP>‘ÁÁè–™`]‘‹4œ`<Ğr\0ùÃ›ç¨û¡–z–4Ù‡¥Ë8€ùÎĞ4ó`mãh:¢Îª¬HDªãÀjÏ+p>*ä‹ÃÄê8äŸÕ 08—A¸È:€À»Ñ´]wêÃºùz>9\n+¯ççÍÀñØ:—°ii“PoG0°Öö1ş¬)ìŠZ°Ú–èn¤È’ì×eRÖ–Üí‡g£M¢à”ÀŒgs‰LC½rç8Ğ€!°†À‚Œ3R)Îú0³0Œôs¨IéJˆVPpK\n|9e[á•ÖÇË‘²’D0¡Õ àz4Ï‘ªo¥Ôéáèà´,N8nåØsµ#{è“·z3ğ>¸BSı\";Àe5VD0±¬š[\$7z0¬ºøÃËã=8ş	T 3÷»¨Q÷'R’±—’ØnÈ¼LĞyÅ‹ìö'£\0oäÛ,»‰\0:[}(’¢ƒ|×ú‡X†>xvqWá“?tBÒE1wG;ó!®İ‹5Î€|Ç0¯»JI@¯¨#¢ˆŞuÅ†Iáø\\p8Û!'‚]ß®šl-€låSßBØğ,Ó—·»ò]èñ¬1‡Ô•HöÿNÂ8%%¤	Å/;FGSôòôhé\\Ù„ÓcÔt²¡á2|ùWÚ\$tøÎ<ËhİOŠ¬+#¦BêaN1ùç{ØĞyÊwòš°2\\Z&)½d°b',XxmÃ~‚Hƒç@:d	>=-Ÿ¦lK¯ŒÜşJí€\0ŸÌÌó@€rÏ¥²@\"Œ(AÁñïªıZ¼7Åh>¥÷­½\\Íæú¨#>¬õø\0­ƒXrã—YøïYxÅæq=:šÔ¹ó\rlŠoæm‡gbööÀ¿À˜ï„D_àTx·C³ß0.Šôy€†R]Ú_İëÇZñÇ»WöIàëGÔï	MÉª(®É|@\0SO¬ÈsŞ {î£”ˆø@k}äFXSÛb8àå=¾È_ŠÔ”¹l²\0å=ÈgÁÊ{ HÿÉyGüÕáÛ sœ_şJ\$hkúF¼q„àŸ÷¢Éd4Ï‰ø»æÖ'ø½>vÏ¬ !_7ùVq­Ó@1zë¤uSe…õjKdyuëÛÂS©.‚2Œ\"¯{úÌKşØË?˜s·ä¬Ë¦h’ßRíd‚é`:y—ÙåûGÚ¾\nQéı·Ùßow’„'öïhS—î>ñ©¶‰LÖX}ğˆe·§¸G¾â­@9ıãíŸˆüWİ|íøÏ¹û@•_ˆ÷uZ=©‡,¸åÌ!}¥ŞÂ\0äI@ˆä#·¶\"±'ãY`¿Ò\\?Ìßpó·ê,Gú¯µı×œ_®±'åGúÿ²Ğ	ŸT†‚#ûoŸÍH\rş‡\"Êëúoã}§ò?¬şOé¼”7ç|'ÎÁ´=8³M±ñQ”yôaÈH€?±…ß®‡ ³ÿ\0ÿ±öbUdè67şÁ¾I Oöäïû\"-¤2_ÿ0\rõ?øÿ«–ÿ hO×¿¶t\0\0002°~şÂ° 4²¢ÌK,“Öoh¼Î	Pc£ƒ·z`@ÚÀ\"îœâŒàÇH; ,=Ì 'S‚.bËÇS„¾øàCc—ƒêìšŒ¡R,~ƒñXŠ@ '…œ8Z0„&í(np<pÈ£ğ32(ü«.@R3ºĞ@^\r¸+Ğ@ , öò\$	ÏŸ¸„E’ƒèt«B,²¯¤âª€Ê°h\r£><6]#ø¥ƒ;‚íC÷.Ò€¢ËĞ8»Pğ3ş°;@æªL,+>½‰p(#Ğ-†f1Äz°Áª,8»ß ÆÆPà:9ÀŒï·RğÛ³¯ƒ¹†)e\0Ú¢R²°!µ\nr{Æîe™ÒøÎGA@*ÛÊnDöŠ6Á»ğòóíN¸\rR™Ôø8QK²0»àé¢½®À>PN°Ü©IQ=r<á;&À°fÁNGJ;ğUAõÜ¦×A–P€&şõØã`©ÁüÀ€);‰ø!Ğs\0î£Áp†p\r‹¶à‹¾n(ø•@…%&	S²dY«ŞìïuCÚ,¥º8O˜#ÏÁ„óòoªšêRè¬v,€¯#è¯|7Ù\"Cp‰ƒ¡Bô`ìj¦X3«~ïŠ„RĞ@¤ÂvÂø¨£À9B#˜¹ @\nğ0—>Tíõá‘À-€5„ˆ/¡=è€ ¾‚İE¯—Ç\nç“Âˆd\"!‚;ŞÄp*n¬¼Z²\08/ŒjX°\r¨>F	PÏe>À•OŸ¢LÄ¯¡¬O0³\0Ù)kÀÂºã¦ƒ[	ÀÈÏ³Âêœ'L€Ù	Ãåñƒ‚é›1 1\0ø¡Cë 1Tº`©„¾ìRÊz¼Äš£îÒp®¢°ÁÜ¶ìÀ< .£>î¨5İ\0ä»¹>Ÿ BnËŠ<\"he•>ĞººÃ®£çsõ!ºHı{Ü‘!\rĞ\rÀ\"¬ä| ‰>Rš1dàö÷\"U@ÈD6ĞåÁ¢3£çğŸ>o\r³çá¿vL:K„2å+Æ0ì¾€>°È\0äí ®‚·Bé{!r*Hî¹§’y;®`8\0ÈËØ¯ô½dş³ûé\rÃ0ÿÍÀ2AşÀ£î¼?°õ+û\0ÛÃ…\0A¯ƒwSû‡lÁ²¿°\r[Ô¡ª6ôcoƒ=¶ü¼ˆ0§z/J+ê†ŒøW[·¬~C0‹ùeü30HQP÷DPY“}‡4#YDö…ºp)	º|û@¥&ã-À†/F˜	á‰T˜	­«„¦aH5‘#ƒëH.ƒA>Ğğ0;.¬­şY“Ä¡	Ã*ûD2 =3·	pBnuDw\n€!ÄzûCQ \0ØÌHQ4DË*ñ7\0‡JÄñ%Ä±puD (ôO=!°>®u,7»ù1†ãTM+—3ù1:\"P¸Ä÷”RQ?¿“üP°Š¼+ù11= ŒM\$ZÄ×lT7Å,Nq%E!ÌS±2Å&öŒU*>GDS&¼ªéó›ozh8881\\:ÑØZ0hŠÁÈT •C+#Ê±A%¤¤D!\0ØïòñÁXDAÀ3\0•!\\í#h¼ªí9bÏ‚T€!dª—ˆÏÄY‘j2ôSëÈÅÊ\nA+Í½¤šHÈwD`íŠ(AB*÷ª+%ÕEï¬X.Ë Bé#ºƒÈ¿Œ¸&ÙÄXe„EoŸ\"×è|©r¼ª8ÄW€2‘@8Daï|ƒ‚ø÷‘Š”Núhô¥ÊJ8[¬Û³öÂö®WzØ{Z\"L\0¶\0€È†8ØxŒÛ¶X@”À E£Íïë‘h;¿af˜¼1Âş;nÃÎhZ3¨E™Â«†0|¼ ì˜‘­öAà’£tB,~ôŠW£8^»Ç ×ƒ‚õ<2/	º8¢+´¨Û”‚O+ %P#Î®\n?»ß‰?½şeË”ÁO\\]Ò7(#û©DÛ¾(!c) NöˆºÑMF”E£#DXîgï)¾0Aª\0€:ÜrBÆ×``  ÚèQ’³H>!\rB‡¨\0€‰V%ce¡HFH×ñ¤m2€B¨2IêµÄÙë`#ú˜ØD>¬ø³n\n:LŒıÉ9CñÊ˜0ãë\0“x(Ş©(\nş€¦ºLÀ\"GŠ\n@éø`[Ãó€Š˜\ni'\0œğ)ˆù€‚¼y)&¤Ÿ(p\0€Nˆ	À\"€®N:8±é.\r!'4|×œ~¬ç§ÜÙÊ€ê´·\"…cúÇDlt‘Ó¨Ÿ0c«Å5kQQ×¨+‹ZGkê!F€„cÍ4ˆÓRx@ƒ&>z=¹\$(?óŸïÂ(\nì€¨>à	ëÒµ‚ÔéCqÛŒ¼Œt-}ÇG,tòGW ’xqÛHf«b\0\0zÕìƒÁT9zwĞ…¢Dmn'îccb H\0z…‰ñ3¹!¼€ÑÔÅ HóÚHz×€Iy\",ƒ- \0Û\"<†2ˆî Ğ'’#H`†d-µ#cljÄ`³­i(º_¤ÈdgÈíÇ‚*Ój\rª\0ò>Â 6¶ºà6É2ókjã·<ÚCq‘Ğ9àÄ†ÉI\r\$C’AI\$x\r’H¶È7Ê8 Ü€Z²pZrR£òà‚_²U\0äl\r‚®IRXi\0<²äÄÌr…~xÃS¬é%™Ò^“%j@^ÆôT3…3É€GH±z€ñ&\$˜(…Éq\0Œšf&8+Å\rÉ—%ì–2hCüx™¥ÕI½šlbÉ€’(hòSƒY&àBªÀŒ•’`”f•òxÉv n.L+ş›/\"=I 0«d¼\$4¨7rŒæ¼A£„õ(4 2gJ(D˜á=F„¡â´Èå(«‚û-'Ä òXGô29Z=˜’Ê,ÊÀr`);x\"Éä8;²–>û&…¡„ó',—@¢¤2Ãpl²—ä:0ÃlI¡¨\rrœJDˆÀúÊ»°±’hAÈz22pÎ`O2hˆ±8H‚´Ä„wt˜BF²Œg`7ÉÂä¥2{‘,Kl£ğ›Œß°%C%úomû€¾àÀ’´ƒ‘+X£íûÊ41ò¹¸\nÈ2pŠÒ	ZB!ò=VÆÜ¨èÈ€Ø+H6²ÃÊ*èª\0ækÕà—%<² øK',3ØrÄI ;¥ 8\0Z°+EÜ­Ò`Ğˆ²½Êã+l¯ÈÏËW+¨YÒµ-t­fËb¡Qò·Ë_-Ó€Ş…§+„· 95ŠLjJ.GÊ©,\\·òÔ….\$¯2ØJè\\„- À1ÿ-c¨²‚Ë‡.l·fŒxBqK°,d·èË€â8äA¹Ko-ô¸²îÃæ²°3KÆ¯r¾¸/|¬ÊËå/\\¸r¾Ëñ,¡HÏ¤¸!ğYÀ1¹0¤@­.Â„&|˜ÿËâ+ÀéJ\0ç0P3JÍ-ZQ³	»\r&„‘Ãá\nÒLÑ*ÀËŞj‘Ä‰|—ÒåËæ#Ô¾ª\"Ëº“AÊï/ä¹òû8)1#ï7\$\"È6\n>\nô¢Ã7L1à‹òh9Î\0B€Z»d˜#©b:\0+A¹¾©22ÁÓ'Ì•\nt ’ÄÌœÉOÄç2lÊ³.L¢”HC\0™é2 ó+L¢\\¼™r´Kk+¼¹³Ë³.êŒ’êº;(DÆ€¢Êù1s€ÕÌòdÏs9Ìú•¼ P4ÊìŒœÏó@‹.ìÄáAäÅnhJß1²3óKõ0„Ñ3J\$\0ìÒ2íLk3ãˆáQÍ;3”Ñn\0\0Ä,ÔsIÍ@Œûu/VAÅ1œµ³UMâ<ÆLe4DÖ2şÍV¢% ¨Ap\nÈ¬2ÉÍ35ØòĞA-´“TÍu5š3òÛ¹1+fL~ä\nô°ƒ	„õ->£° ÖÒ¡M—4XLóS†õdÙ²ÖÍŸ*\\Ú@Í¨€˜YÓk¤Š¤ÛSDM»5 Xf° ¬ªD³s¤äÀUs%	«Ì±p+Ké6ÄŞ/ÍÔüİ’ñ8XäŞ‚=K»6pHà†’ñ%è3ƒÍ«7lØI£K0ú¤ÉLíÎD»³uƒêõ`±½P\rüÙSOÍ™&(;³L@Œ£ÏˆN>Sü¸2€Ë8(ü³Ò`J®E°€r­F	2üåSE‰”M’†MÈá\$qÎE¶Ÿ\$ÔÃ£/I\$\\“ãáIDå\" †\nä±º½w.tÏS	€æ„Ñ’Pğò#\nWÆõ-\0CÒµÎ:jœRíÍ^Süí„Å8;dì`”£ò5ÔªaÊ–ÇôE¹+(XröMë;Œì3±;´•ó¼B,Œ˜*1&î“ÃÎË2XåS¼ˆõ)<Í ­L9;òRSN¼Ş£ÁgIs+ÜëÓ°Kƒ<¬ñsµLY-Z’:A<áÓÂOO*œõ2vÏW7¹¹+|ô €Ë»<TÖóÕ9 h’“²Ïy\$<ôÎ#Ï;ÔöÓá›v±\$öOé\0­ ¬,Hkòü-äõàÏš\rÜú²ŸÏ£;„”¹O•>ìù“·Ë7>´§3@O{.4öpO½?TübÃÏË.ë.~O…4ôÏSïÏì>1SS€Ï*4¶PÈ£ó>ü·ÁÏï3í\0ÒWÏ>´ô2å><ëóßP?4€Û@Œôt\nNÀÇùAŒxpÜû%=P@ÅÒCÏ@…RÇËŸ?x°ó\n˜´Œ0NòwĞO?ÕTJC@õÎ#„	.dş“·MêÌt¯&=¹\\ä4èÄAÈå:L“¥€í\$ÜéÒNƒ­:Œ’\rÎÉI'Å²–AÕráŒ;\r /€ñCôÈåBåÓ®Œi>LèŠ7:9¡¡€ö|©C\$ÊË)Ñù¡­¹z@´tlÇ:>€úCê\n²Bi0GÚ,\0±FD%p)o\0Š°©ƒ\n>ˆú`)QZIéKGÚ%M\0#\0DĞ ¦Q.Hà'\$ÍE\n «\$Ü%4IÑD°3o¢:LÀ\$£Îm ±ƒ0¨	ÔB£\\(«¨8üÃé€š…hÌ«D½ÔCÑsDX4TK€¦Œ{ö£xì`\n€,…¼\nE£ê:Òp\nÀ'€–> ê¡o\0¬“ıtIÆ` -\0‹D½À/€®KPú`/¤êøH×\$\n=‰€†>´U÷FP0£ëÈUG}4B\$?EıÛÑ%”T€WD} *©H0ûT„\0tõ´†‚ÂØ\"!o\0Eâ7±ïR.“€útfRFu!ÔDğ\nï\0‡F-4V€QHÅ%4„Ñ0uN\0ŸDõQRuEà	)ÍI\n &Q“m€)Çš’m ‰#\\˜“ÒD½À(\$Ì“x4€€WFM&ÔœR5Hå%qåÒ[F…+ÈùÑIF \nT«R3DºLÁo°Œ¼y4TQ/E´[Ñ<­t^ÒËFü )Qˆå+4°Q—IÕ#´½‰IF'TiÑªXÿÀ!Ñ±FĞ*ÔnRÊ>ª5ÔpÑÇKm+ÔsÇÜ û£ïÒáIåôŸREı+Ô©¤ÙM\0ûÀ(R°?+HÒ€¥Jí\"TÃDˆª\$˜Œà	4wQà}Tz\0‹Gµ8|ÒxçÍ©R¢õ6ÀRæ	4XR6\nµ4yÑmNôãQ÷NMà&RÓH&É2Q/ª7#èÒ›Ü{©'ÒÒ,|”’ÇÎ\n°	.·\0˜>Ô{Áo#1D…;ÀÂĞ?Uô‘Ò•Jò9€*€š¸j”ı€¯F’N¨ÒÑ‰Jõ #Ñ~%-?CôÇßL¨3Õ@EP´{`>QÆÈ”µÔ%Oí)4ïR%IŠ@Ôô%,\"ÕÓùIÕ<‘ëÓÏå\$Ô‰TP>Ğ\nµ\0QP5DÿÓkOFÕTYµ<ÁoıQ…=T‰\0¬“x	5©D¥,Â0?ÍiÎ?xş  ºmE}>Î|¤ÀŒÀ[Èç\0€•&RL€ú”H«S9•G›I›§1ä€–…M4V­HşoT-S)QãGÇF [ÃùTQRjN±ã#x]N(ÌU8\nuU\n?5,TmÔ?Ğÿ’Ü?€ş@ÂU\nµu-€‹Rê9ãğU/S \nU3­IEStQYJu.µQÒõF´o\$&ŒÀûi	ÜKPCó6Â>å5µG\0uR€ÿu)U'R¨0”Ğ€¡DuIU…J@	Ô÷:åV8*ÕRf%&µ\\¿RÈõMU9RøüfUAU[T°UQSe[¤µ\0KeZUa‚­UhúµmS<»®À,Rès¨`&Tj@ˆçGÇ!\\xô^£0>¨ş\0&ÀpÿÎ‚Q¿Q)T˜UåPs®@%\0ŸW€	`\$Ôò(1éQ?Õ\$CïQp\nµOÔJ¹ñX#ƒıV7Xu;Ö!YBî°ÓSåcşÑ+V£ÎÃñ#MUÕW•HÍUıR²Ç…U-+ôğVmY}\\õ€ÈOK¥Mƒì\$ÉSíeToV„ŒÍHTùÑ!!<{´RÓÍZA5œRÁ!=3U™¤(’{@*Ratz\0)QƒP5HØÒ“ÎÕ°­N5+•–ÏP[Ôí9óV%\"µ²ÖØ\n°ıñäG•SL•µÔò9”ùÇÌë•lÀ£ˆ‘\rVˆØ¤Í[•ouºUIY…R_T©Y­p5OÖ§\\q`«U×[ÕBu'Uw\\mRUÇÔ­\\Es5ÓK\\úƒïVÉ\\ÅS•{×AZ%Oõ¼\$Ü¥FµÔ¬>ı5E×WVm`õ€Wd]& \$ÑÎŒÅ•ÛÓ!R¥Z}Ô…]}v5À€§ZUgôÔQ^y` Ñ!^=F•áRÁ^¥vëUÅKex@+¤Şr5À#×@?=”uÎ“s •¤×¥YšNµsS!^c5ğ\$.“u`µÜ\0«XE~1ï9Ò…JóUZ¢@²#1_[­4JÒ2à\nà\$VI²4n»\0˜?ò4aªRç!U~)&ÓòB>t’RßIÕ0ÀÔ_EkTUSØœ|µıUk_Â8€&€›E°ü(â€˜?â@õ××JÒ5Ò½JU†BQT}HVÖ‘j€¤Qx\neÖVsU=ƒÔıV‘N¢4Õ²Ø—\\xèÒÖïR34İG¿D\":	KQş>˜[Õ\rÕY_å#!ª#][j<6Ø®X	¨ìÍc‰•Ø#KL}>`'\0¨5”XÑcU[\0õ(ÔÙÑWt|tô€R]pÀ/£]H2I€QO‹­1âS©Qj•Z€¨¸´Hº´m¨ÌÙ)dµ^SXCY\rtu@Jëpüµ%ÓÿM¸ø€¨óµ“Ö?ÙUQ°\nö=Råar:Ô¿Eí‘À¥-G€\0\$ÑÇd½“ö]Òmeh*ÃìQ‰Wt„öc€¡`•˜AªY=S\r®¯«	m-´‚¤=MwÖH£]Jå\"ä´Ä õş­fõ\"´{#9Teœ‰ÙÍMÔc¹ñNêI£òÙßD¥œõÙÜçUœ6ÙñgÑ2Ù×İ¶eƒa­L´€Q&&uTåX51Y >£óûSıÖŠQ#êIµ¥Õj\0ûœ£ÅW PÑş?ub5FUóLn¶)V5R¢@ãë\$!%o¶ÔPúÉ'€‰EµUÁÔP-†¶š¤Bp\nµF\$ŸS4…t±UF|{–qÖÈ“0û•ÎUmjsÎÃü€²øı\$´Ú›j…cëÚå¦Ö«€¿aZI5X€ƒj26®¤&>vÑ\n\r)2Õ_kîG¶®TJÚÁeQ-cîZñVM­Ö½£z>õ]•a¹c£Ëcìß`t„”HÚÑjİ6¹£+kŠM–\0Œ>Œ„€##3l=à'´¥^6Í\0¨Ã¨v¦Z9Se£€\"×ÊêbÎ¡ÔB>)•/TÁ=ö9\0ù`Pà\$\0¿]í/0Úª•«äµ½k-š6İÛ{küÖá[F\r|´SÑ¿J¥õMQ¿D=õ/ÈWX¢öœV—a¬'¶¹éa¨to€©lå†¶ĞXj}C@\"ÀKPÛÎÖÚom’3\0#HV”µ…v÷Ñ~“{µÖ?gx	n|[Ø?U¶äµ[rê½h¶ŞG¸`õ3#Gk%L£ê\0¿I`CùDŞê¸	 \"\0ˆŒÅ§¶°#cN«6ßÚ¹fÂÔzÛêº;Ñ¤ÃeeF–7Ù/N\r:ôâQñGÕ9	\$ÔóIøÕ¼ºß]£®TİØWGs«ÔdWõMÚIãèÑÙf’BcêÛ¤êõÂ÷!#cnu&(ŞSã_Õw£ùSfë&TšZ:…0CóSÙLN`Ü³Yj=·¶>Å²ÃñZ!=€rV]gû	Ó£rµ ËXlŒÉ-.¹UÄ'uJuJ\0ƒs­J¶'W%·¶­\\>?òBöëV­j4µÏJ}I/-ÒrRLºSè3\0,RgqÓ­ôÇTf>İ1Õï\0¥_•”Ç\\V8õ¡ZÛt…Ácè€†ú<^\\ùll´j\0¾˜şT¥]CİÔw×Î“zI¶ÙZwN…¶¶pVW…jv»Y¶>2Ó	o\$|U‡WÃL%{toX3_õ¶òR‰J5~6\"×ãZl}´`Ôkc­ÑîÛeR=^UÔ•¥1òÑ½w7eØdµİvÙb=á\0ùf €,³må)ÕéGpûÕ-Ó¼½)9Lı“š>|Ôë \"Ì@èû¤5§`†:›ô\0é,€ñt@ºÄxº“òlÃJÈ»b¨6 à…½‰İaŞA\0Ø»ARì[A»Ã0\$qo—AàÊSÒü@Ìø¬<@ÓyÄĞ\"as.âÎä÷V^„•è®¥^õ›…—œ\0ÜÈHÁ·[H@’bK—©Ş)zÀ\r·¨¤¤=éÁ^¿zˆB\0º¿’¤äNéo<Ì‡t<xî£\0Ú¬0*R ºI{¥í®´^æEµî·¸:{KÕ§1Eˆ0²ÓYº•›à/ÕÑcêÀ\"\0„ê¸4øÉF7'€†˜\nÕ0İÉ`U£Tù¤?MPÔÀÓlµÈ4ŒÓr(	´ÁZ¿|„€&†©t\"Iµ¿ÖÛL w+Òm}…§÷€Wi\r>ÖU__uÅ÷63ßy[¢8µT-÷ÙVÏ}¤xãô_~è%ø7Ùß{jMáo_šEù÷ØÓë~]ôP\$ßJõCaXGŠ9„\0007Åƒ5óA#á\0.‹Àä\rË´_Ö¢áÀßÚ%şáÀÀ\n€\r#<MÅxØJËù±|¸Ø2ğ\0¨–;oŒ^a+F€í¸Îç¬€LkúÁ;À_Ûİê#€¾M\\“¬€¤pr@ä“ÃµÆÔøÂşOR€¿ñ–~zÇûAÁNE°YÁO	(1N×‰ˆRø¨8Ø€C¼¦ë¨Én?O)ƒ¶1AçDo\0ä\r»Ç¢?àkJâî‘“„\"â,OFÈÌa…›ùª-bà6]PSø)Æ™ 5xCâ=@j°€ÇL”ÁèÈLî˜:\"èƒ»ÎŠ¤l#¢ÀéBèk£“ˆ›€ÖË@ •Nº:ê>ï|Bé9î	«Èî”:Nıñ\$èéS¥ CB:j6î—Şé•àÎ‰Jk”†uKğ_W›Í¢Ã˜I =@TvãÒ\n0^o…\\¿Ó ?/Á‡&uê.ŞØ_˜æ\r®î¥Cæì+Úøc†~±J¸b†6ÓüØe\0ÍyóÑ¡\0wxêhÁ8j%S›À–VH@N'\\Û¯‡ÆN¥`n\r‹ÒuŞn‰KèqUÃBé+í˜f>G‡°\r¸»ˆ=@G¤Åädç‚†\nã)¬ĞFOÅ hÊ·›†ÃˆfC‡É…X|˜‡I…]æğ3auyàUi^â9yÖ\no^rt\r8ÀÍ‡#óîØâN	VÈâY†;Êc*â%Và<›‰#Øh9r \rxcâv(\raŸá¨æ(xja¡`g¸0çVÌ¼°Œ¿Q†©x(ÇëƒÀglÕ°{—Ægh`sW<Kj°'¿;)°Gnq\$¨pæ+ÎÉŒ_ŠÉdø¶^& ¯Š˜DÂxà!bèvŞ!EjPV¤' ââÁ(”=ÏbÂ\rˆ\"–b¦İL¼\0€¿Ìbtá‚\n>J¬Ôã1;üù¼ÖîÛˆ¿4^s¨QÁp`Öfr`7‚ˆ«xª»E<lÑÏã	8sş¯'PT°øÖºæËƒ¸°z_ÊT[>Ğ€:Ïó`³1.î¾°;7ó@[ÑŞ>º6!¡*\$`²•\0À„æ`,€“øÇàİÁ@°àáå?Ìm˜>ƒ>\0êLCÇ¸ñˆR¸În™°/+½`;CŠ£Õø\0ê½*€<F“„ö+ëƒâ„q MŒÁş;1ºK\nÀ:b3j1™Ôl–:c>áYøhôìŞ¾#Ô;ã´Ü3Öº”8à5Ç:ï\\Şï¨\0XH·Â…¶«aş®¸™M1ä\\æL[YC…£vN’·\0+\0Ôät#ø\$¬ÆØØà!@*©l¦„	F»dhdİıùF›‘à&˜˜Æ˜fó¹)=˜¦0¡ 4…x\0004ED6KÍòä¢£±…”\0ònN¨];qº4sj-Ê=-8½ê†\0æsÇ¨ûˆ¹D§f5p4Œàé©Jè^Öí’'Ó”[úùH^·NR F˜Kw¼z¢Ò ÜĞE”º“ágF|!Èc©ôäo•dbÁêùxß\0ì-åà6ß,Eí„_†íê3uåp ÇÂ/åwz¨( ØexRaºH¼YùceŠš5ê9d\0ó–0@2@ÒÖYùfey–YÙcM×•ºhÙÃ•Ö[¹ez\rv\\0Áeƒ•ö\\¹cÊƒ†î[Ùue“—NY`•åÛ–Î]9hå§—~^Yqe±–¦]™qe_|6!Şóuï`fÕî™Jæ{è7¸ºM{¶YÙ‡©øj‚eÆÌC»¢S6\0DuasFL}º\$È‡à(å”Mb…ÈàÆ¤,0BuÎ¯…ì¥Ñ‚2ögxFÑ™{a¸n:i\rPjıeÏñ˜rÈrØÏGıBY ˆM+qïçiY”dË™é`0À,>6®foš0ù©†o™ó æXf¢äù\0ÀVİL!“«f…†láœ6 Å/ëæ£1eƒ•\0‰>kbfé\r˜!ïufò<%ä(rË›ùa&	ı™¨àY€Ş!¡Òñ–mBg=@ƒĞ\rç; \rŞ5phI 9bm›\$BYË‹ÿšÄgxç#‰@QEOÇæm9–®Ë0\"€ºç!t¨˜ê†Ë‰¸®Ğ‡çO* Ååÿ\0Âİ>%Ö\$éoîrN&s9¿f£4çù™gŠä~jMùf›wyèg›yí\\`X1y5xÿŒù^zï_,& kÑæ¢é|¡€À¦1xçÏA‘6ğ \nîoè”»Œ&xÙïgg™{r…?ç·›ü-°½…®|tä3±šˆÈÍ}gHgK¢9¿¿¨õJÀ<C C° 1„î9ş7‡g÷š‚ïh6!0Hâí›cdy´fÿ¡DA;ƒ‚9…Tæ¢ÿ®0¬Ä\0ÆpØàù†!‡ 6^ã.øSÂ²?ÆØ¦E(P­Îˆ .æÂ 5€ÄhŠéˆEPJv‰ .‹•¢+—\$ç5Œ>P+µ?~‰¡gŒ6\r³öh¢¼p«z(è†WÙÄ`Â•¨±\"y¯ñÏ:ĞFadÅ¬6:ù¡f˜Şi\0ì˜İØàA;áe¢°àì¬ç^ÊÖwf„ >yÍŠËõ`-\rŠÚ…á\0­hr\rÎr£8i\"_Ú	££¼9¡CI¹fXËˆ2¦‰š\"ÍÅ¢‰… øh¢L~Š\"ö…š%V•:!%Šxyèizyg„vxÚ]‚Æ}qgÄÃZiŒä|Œ`Ç+ _úgèòú†™Ù£¾úªÂÀÂè­6PA€Ê€\$¶=9¢ŒùàÍh‹¢|p’ ÿ¢ˆé˜íè!¢.ø!”ş¶üiç§^œøÚiË¢8zVCÌùöŒZ\"€æäØ(Ä¥›¹°9èU)û¥!DgU\0Ãjÿã¿?`Çğ4ãLTo@•B¤§úN†aš{Ãrç:\nÌŸ“E„»8Ã¦&=êE¨*Z:\n?˜¨g¢èÌŠ£‹h¢õ.•˜’ Nş5(ˆSƒhÑôi2Ö*c„fı@•“ÑŞ7¦œz\"áƒ|ÖúrP†.Ç€ÊL8T'¿¸k¢ˆß:(¹q2&œÆED±2~ÿ¿Ø±şœŒ¬Ã9ûÒÂv£©¼8ÿƒ©– @úé^X=X`ªqZºĞQ«Ö®`9jø5^ˆ¹å@ç«¸În¼qv±á¨3±ÚÇèŠ(I6ğªjšdT±ÚÂ\\Š ‚Ÿ3¢,™Ïhék¢3ú(ë3¬‘‘PÒu•VÏ|\0ï§†Uâk;¢ÌJQ¶ã é. Ú	:J\rŠ1ŸênìBI\r\0É¬h@˜¼?ÒN±\nsh—®å\"ë’ò;¦r~7O§\$ ú(ã5¤RÅèÆ	èÊ½jÂîšØFYF šÜ”£«~‰xŞ¾©f º\"ã†vÛ“ošëË¨ººÂº#ŒÜaÒèŠõ¶®P“„Ë<ãáh£-3éº/Gx®õ²nÇi@\"’G…?ó¤,ïZpÖxX`v¦4XÆõóàû„[ƒI¶œ7Ã¥Xc	îÅ!¡bç¢}ÚjŒ_¾¥9á5qti¦6f»’°¸İÙ5ÿûç FÆ¹ãiÑ±©pX'ø2¡rƒ„®0ÆÆºé§D,#GëU2€ÌØâIè\rl(£— €ì±£¦¨=ĞA¸a€ì©³-8›dbSşˆûõ4~‚ô—H;°Â­0à6Çbé{ª„ŞºRæèÃs3zë¯ÃÀüNğŞ„`ÆË†+ò¦­ 4<ø^aƒy°¬”	}r°Âây´õãáû¸kŒ&4@ˆÁ?~ÔäÅcE´ÂÈ­@ˆLS@€Œéz^qqN¦°</H‚j^sCâ`èæsbgGy¹¤Ö^\nÈNó\n:G¶N}¼c\nîÚÕí¤ +£†ï=†pÙ1º’NµTB[dÀÿ¶–š¶Ğ‹¢¾Ü¹ñ`³nÚoj;jÄ›whØõ€c9ƒ‚pÌ¡[y4«¨¶05œÍ‹NßÁ+Î¿·Ğ`Xdaáæ/zn*öPÀ‡êÁ¸#tíèµ¸~à9Wî	šVâò~=¸#Ùùn)¨î´î	2ÜÉ;…j:õ°Ják„C¸!>xîù5š£==¦2»—‚. ã|¿'¨îä[€Ì'—;üÚv½ù«–“¸„®÷ÎëÎ;:SA	º&Ğ[£me†êãn±ëúûªî™«Ëµ¦Ä•<Ÿº6ma‘=Y.ç¥ÀÅ:g¶ÔşÉè…€ù°Ğ;«Iß»xÅ[”éI¡J\0÷~ÂzaY®íºîüwT\\`–íV\nÆ~P)ézJ¾©æ½üñğQ@İà[¶{rÊ‰µDîB„v—ï|i-¹EæøKŒ;^n»{êó½å:Nh;–—Ú2Á¨Æ€pçÑ´6“úƒ»ç½˜9§9¡¥öÖXÂhQœ~—ÛÛiAŸ@D šj‡¥î}ÑozLV÷ïçÑ³~ù•	8B?â#F}F¾Td­ë»áĞe±ÃzcîçŸFÅÀŠg‚7Î—Ûêà€ 6ı#.EÂ£¼áÀÖÂ£¥ğS£.J3¥ö5»¯KÉ¥óJ™§¸;¤—„n5¾¾:ySï‘ÀCÛvoÕ½.˜{ñğ	d\\0ë?W\0!)ğ'šû¼èEgá;à+»\0üY Ntbp+À†cŒø“ş£\0©B=\"ùc†Tñ:Bœ±Á¤úcğïˆşîÆï¸P‘IÜÈD¸ÂV0ÊÇ!ROl‰O˜N~aFş|%Éßº³¸¬…ò)Où¿	Wìo´û‡Qğw¨È:ÙŸlé0h@:ƒ«ÀÖ…8îQ£&™[Ànç¹FïÛp,Ã¦å@‡ºJTöw°9½„(ş†œ<é{ÃÆO\rñ	¥àùÚ‚\$m…/HnP\$o^®U¡Ì\"»¿ã{Ä–…<.îç¡‹n¥q8\rÕ\0;³n£ÄŞÔÛğç¡Ÿˆ+ÎŞ³3¢¼n{ÃD\$7¬,Ez7\0…“l!{˜é8÷á¶xÒ‚°.s8‡PA¹FxÛrğÄÓôQÛ®€¹†1Ì…¸p+@ØdÔŞ9OP5¼lKÂ/¾‘·¾˜\\mæú¸Äs‡q» îvºQí/§ÿÜ	„!»¶åz¼7¾oœ¿EÇ†Ò:qàV 5˜?G¡HO®âO†\$ül¾š+â,òœ\r;ãç°¾¤’~ÎAÄéŒ³é{È`7|‡ÿÄ‚Äàër'‰°Ji\rc+¢|—#+<&Ò›¹<W,Ã>¢»^òPğ&nÂJhĞe‡%d¶æìèÏÜCƒi¶zXÃAÿ'DÍ>ÉÎˆ¡Ek£Ê¬@©Bòw(€.–¾\n99Aê¯hNæcîkN¾d`£ĞÂp`Âò°%2ö¦½3H†Ëb2&¨< 9¤R(òÀ‡táTH¬	àz‘Ö'œ× oòÀ‹>4?Ô\rZÌwÊÓ‚ä×4ƒ`ºÈĞ‡é†µ³N‡ñŸéÓ€î'-IõÈì†÷0(S¨rØw,ü¹ĞåËKÊrÍÌ'-2Hlo-ÁUòáËâ_’'W#'/üÉHÖŸ¤®j6“Ì‰¡¡ÉàÈ«¶\0é„<‘„ÚúŒj1¤E’QŒTÜT­ÆrÁBcmí16ãÍˆgÙ«:w6Í¯›h@1ÅI:¤ÃÁ’Éş2ópò’L/ÎÁŸÂwÿ:òÅ‘ÓÎøK<ğÌE<‚şJ­76Ó€s×.Ì²sZóß/\$÷AsEyÏœàrÚr:w?Õ‰”!Ï?³áêÇ™ĞZ“MÍ9»Õ\0ÏÁ1?ARÍ¦%Ğ7>ÖMÇARr}sé€ñr)\\t-8=³öÍËĞUıË,WOCsÕ†„Ğ#w½5®á¯ERlM*¯D³ç1ûÑ>]ÏÀgK¤²V¹\nÜ\\èÜÓsˆÜ‡8Í¹seÍ§9­soÎ~„ ìów4xàŒ†’ñf@×ĞÜD­ö9€‡ÎÊ6¬\0	@.©î²@´9\0ŠC;Kôy+ÓJğ“ÜÙ¥ƒÏu<\\û`òc{Ó‹¤E£>ÿyÁJ=lŒüïá/…-—7˜ş”ĞZ46¨uC5™‘PçÎ©´RVĞòæ¡ÜáĞıÊ³lVøÒaNxû`Õ´?UÛ7(HP“}jVØJëzNQJ÷S–¸±s-gQ!a¥VØ_SwRıOõ3am‡ZXwZÍo‰'İwa­‰ÖOØoZµ“õ!Ù[\n<ôZ€µO¥Ò¶'ÇÅOmo÷[×Óa=Qºä>‚:õTĞ\nµ¨ç\0Š=€ım×jú–ATÃRÅbu(ÈI×´è:å×\$v¾Wõ×µÃğuÅS¿\\V8Øçvç\\õ•×g!MĞ¶¦uÅÖ_µ&Öis¿\\CÿRVM¢]tXT7\\UoT×Øo_Ô¯İ›S?aÔlÈSØ-LutZGeÇÕái`	}XZ‹i}Q•yW[i­…TŠöYo¦ (ZE\\¨}nÙi—f–‘Ú‹ÙÏW×dÑ%Tıpu3uÍTıf5)vˆÛ]ÕUR3VEY]¥X¸\n·^½§VqS½Sı}XéiGf•Úv>­Sı‚v»JMQšvÚ•Š…ÔÙ\\•g]´QYE“Îİµ#1Vÿl5UØEK]ÕÉ\0³ØİSıU?\\ºBwS•UŠ7–´ÕmZ½V5\\õ¹WfıÂÕ§[¥eUrõ{G\\µıUµÚ,„Éö‘W…[]xö›V×j5mTïV×jİ~u7Ø\0ûV¦UµØ'tı°w?msİÕÔÉÛ5VİÃvİq}Ùöáİu-UqÕ]İ—c]ÚWİØõ]Tt:ífŠM”k¶“e]î¹[-p}^ÔI[©XDãéºåY¿V—dõÀıO]	seNõ£ÜßZ¯WYÚ[Õt…ÈV?ò3ŞÇµßM“öñİ™`Ğût^w£d²:qTL•@@>]Áj\rFİqvµİ-Lv´GKwiôLwIPMo”ùÇ¹Mgv½ÿø[§Uss¦~	èõ…w:BâA‘ŸÑNEù{ä!-ÔÃdıŸo\0´’}&Ş­hXÕÎA–5µ%Ù£fzLÖHÙ5d­” Y…_%…v´Ó™!mšÒ]Öë•ØÒÌ%üñßò€şå=B©>E [#^}öhYFÛa·ßÆ>{¡gS…¶ğp[ìF÷¦ÏDaë6næ´À¶x9«¥8LêIãˆ«N–a=ˆSÊ@úbPk¦.™áNòøHù”l\0ú†:àğè–îŠº2#çÎ˜;¼í®vøO}€9ik]	&®{õ‰ ø«ÕœÙ2|a—·&óãÔÇåÿŞQ½¥ª±ÌîÎç¨)ÉñµoÙ“Ç¸:é&.\0¶5q\0JĞL½é‚64hy€3®Ş¢«¹˜a®Şƒù‚Iz†ÁO‚—–ñ„æï®ˆ\"á¶yB»Ê³{ª3Æ%˜5r(mØÈàÂáÇx.7rÒb%Á‡ü^ e†M€»¢2®\0x—½!‰b}.®âY6\$qS”Ï\"^|xE…äÈøaãş‘¼À€ëXÇ¡5‚9†'T‚R	Ãc9ÄãèW¢1ßáÑAÎ”Pí¦ŸØh6'Şoò-àÖËpµ¾T(\nn\rËÅ“å1Ô„RïRUgÛéƒÈş™“çx¨•Pe#îé*¤âkT<Ÿ<>b;‹“\0™Á˜gL½.<k©ZváÌ„ø¯óz³¶Æ8~¬ğy7€Y¸ïÈêÜ7w¨áOdnÒ>¤<€ú›Eé3ˆ¦wS”Û†œ@¾¡ë® oôWÅ1…ñúñ¾Òº¿zã‰eíŞ½è±å1İˆz÷\0f=ØùcãŠ¤g¹Ÿ{éŞ>nŒp\0±ÍèÎ‘:Hé†BnŒ6FèÆB¯rçW=öãC>M.1~@3ºGí9‡8÷q<Sô|ûY•8QPâû`L[Öqzç˜Û«PÇíèNà<{_-Ù®¥dO¸ùd-îNB7ä4İîBùNÁí.Vº·ç9Æ¨Qø3º{IcP\$§»ºhû¾<R yy…ì?ŞòGÒş:n™ã€µôgÍÁœÿ;Ah!åÔşÁ&å»+>ğË€Û;MÁËŒŞ	ÍşşÃïÿ6SâîŠ·N¸ÚŒ=#ñëëñ³±`üTü#+ìnû;•·r,‚Ç½ğ¦ÏX|#ïÄ\rü# ïÃ?\nüD>¨|VüSñ¿ÂÚeÏ—~Jãm99…á¾\nsÆ{S|r],~ÿË¹ñøé¿ µqÏI?\"|wñ¦øÿ%|Œj‘\0rEò,kSnü¡íç¿øqÆ•Èd8B.ûñ‡1«Ñü³\"™ß/|Æ´€Øƒ]òüˆ¸­€·EüÏœèN²lüÌÕÆxÖËI°÷Ï Icó¿Å¸.|\$8D¹ŸF¨İÌ“…˜PÕKÆò€3ƒô\\j¾¥xUÏC/äã³Ò—¿A{¹ÀĞûşeüÚƒ€ÿÓæ×¶éÜ¾ÿŠÕôà\rpıU\nçÕŸWloÂ­Yâ{ÿô˜ã`]'Öşıs†Õ/|¼oïÿ×à3çÀrü}‹ö;Úÿ[ÊnÎ¹ûÿº—¿OíM7¯ÛÉß£Ø¼q¾µq(ÏĞ_lâqsN÷“yòûñÄçÕ;ŒiÀg¿t—‡ÅÎ:ÿıåÈëÕ™§qk‡¿íôá{÷Ÿß?zı¿÷ÏŞûêñMÈ—ßoıì'àj˜úïá†ãcøyñß„ıãøgß‡gkŒwÉâf8¼VcÔ7fAÌY‘³å+Kxñ…=gKAkşT,95rdã+ùGåÀºíÙ¯„…ñş[Òà%…AÅwæŸµú…½å7ùßåà¬…£%· {½míú8%_”şmú—qˆàVËË¨_ ş“%«!şEƒú¼iø~‘ù²h ú~»ŸCªß­~§ù¨%†„­µ—ç_¨şÙúåÿ·rLkD«yÌúŒğ~Ô?p1O!?¿®vÌ\\ïä±Pm©\"¸Ì<ûŒ¯ïŸÅúE©6… äEŸVğ³åÎñšzkîÇú¦9³zÉªßĞ~Ê/ìäÕº¬é!Q‹>ÿ O£åNmèğ3rˆç Fú˜l‘Òúe;¤Mãß·…ŸºÏ½_a ´!~C»¼f€úå¼b}3œ K¼føÜí. 	Ùä}.©ş»ƒDX	i5¿|úŒ?ğÀ=\0õ±?ï?»ø?£Ş@ˆÿÃ•£½fu~a^’Ønûáªy±Q;ï q¹ÌàŒş)€s’S½,\"G†\nu%ÊÇU­YïAKl\nÓëBØIÊ86VCcO\0Ö`}.x©ƒî„,-Ná‡@~ºèœTÿG›çü–'üÄdÛJƒ÷‚ŸÆy1ƒzl‡á½Ã¦f÷gõ·ùAB aõ!şŒM\\<ƒgÊƒız4Æ¿ìÜ@/³ŞCÜÃ‚ì@õ	¯Qq÷)¤ûxäÁ/Ã.7inD±#=Àœ *79cÂF²ËÑd2(¶ .ÀV€À3µ¿ùÚ\$g`ˆAá§‹rl|øm˜²¶b§‚/¯qE²›ÕÃ´!bU@œ¿9iâ;ppÊdííÛ×¤=ğ1ùy–x°x	™=€v=ø®(v±ï¬s_œ³BoòÉ‚ãÖ#àK\r nñîÈ\\—# Ûf˜PXĞu-3&«	½›J&,FÊ(9¶v´0Á&@khZòy¶gîCÔ‹€z Á”Ãã¦hi=¡s9TñÂ eT>gŒÂ3ëdŞtFûö2b&:¾ğ\0ĞP¡÷€B–š-¹QËº8~ÔLSÆMàˆ™Ú·cgĞÎğTh'òf(Ñ³Ğ\$¨.EŒ«§VLÀ°·œAıI¼ãÃßŒñ†¹¼râ¦ãêgÛ\rÜÙã0§¶œ‚ëTëÎ1P`1’dÔâôÕÄ\r¦4âÁÚ=6@FüÁ¼È F±Ìñœ=¿É‚6ÏA¾Â>åN¥AVß	èÙÚ(\$ÎA/¦·ØÚõ¦;¦­çÚ?¾gŒf^	¬\nè&ğKO³Æn„{]õĞgË›Î8åc¬ÒÑ„–²Ï·Şı³ÿ‚\nÈ7LĞŒ¶‚t:ÒÑ ³hF°VO\r³èJú)bƒ(\"OBÌm°	oØß\$]T„SHÎZ^½õKŒÿ©äwğ\\[A9('ÒÙ„cÛ‘â­Üàb0‚ØÙÄ K’à£åà²srB™x\nè*BaÆz6oƒ\ry&tX1p'›^ƒM·¹<âCg¹`Ì4Ã8GHõ“zd?gX›†.@,‹7wÃïÛ:+ƒTiUX16à“L¸Üs’:\ršLè6‡Á±ƒf—r\r`ãtà67~g°xˆgH9ãJÀ¿O=-\$ğ4?rÙª4½ƒ¨¡O›ûè:z¦§{ÈşD`ó¨‹Ğ21FŒÜµ£Ğ(DòMÓÊ;¥º½ñ&–¡ÍÌ©ÔÚ­¾ƒU>ÎI˜6‹™cİÄò›ß¸@\r/œ/¸¶Ô•ıó_HÀƒ\n7zë ¶ü€“œ‰7òaî É»[9D¢'ü„¿ì}Bÿ€O›R‡ôİŸ¸B#s“¼]z!(DÀ“Å@L^„ı	û³x£İ@oá¿u„OäïÁ¥D¸ÏÜ!e`\na³k>´0`á„€Ì-*™ ˆ8E‡Z6=fÌé%¡™İ×cã›°”K=£ò¤F‡\rÊ…ÂShèyNò[v*vá\rÁää@#ß¸í‰ªAh*ãL\$°À±AÀA\\”¢‚úÓ%Á*	ÄçpŠ\r*==8ì\$Wî\rƒ [±“Jx0yñÛZÃ+&YÙHA~A\n,\\(Öìp¤!F¶êÚ<6SØ&IP`6Xzü+í£dfŞ\r¾ÏJÂ£€ŞÌië•sã+Ò&5¼å/rE…À£M^\$R(R‘QÌÒEw3‰ôlH*m\0Bq¬aŒ¯rèêLB“ª¥Q¹z6~lËùB‰\rIÂ®GøæXÙ¸XVbs¡mB·Hª×ó™ócî_Kç\$pæ-:8„•Nj:ÂÑ…Œ¡-#¢Få	\0’aiBÆs\\)Î<.!Æİ\\ß‰N‹ÒbIw8§Í¹t…øPjWä¨`¶‚y\0ìİ&0˜i?¡ˆÃÒ”:«Ia)=’C†,a&ºM˜apÆƒ\$İI€IFcæ­ç\0!„ƒ˜YÄxa)~¯C1†PÒZL3T¸jİC\0yˆÒ¤`\\ÆWÂü\\t\$¤2µ\næ+a¤\0aKbèíÎ\n„˜]àC@‚º?I\rĞHãƒ®Ks%ÏN©ğ—áË^°ÏÔ9CL/š=%Û¨õhÉÆ:?&PşìEYÒ>5¢ín[GÙ’×%Vàá»*ôw<¥ù­ÕgJ¸]º*éwd®]ŞBŸ5^óÖ¢’OQ>%­s{½Ô…ç•«;ìWö³‰ÖzÂGi®ıÀ*»ùRnìÑG9ĞE°Š¢Ş,(u*°±Õ’Ã—€ŠXÕs«àRŒ¦¦:µ5ë;”æ)°R¶¦ÍNúŠÈvKØ(œR³İM¢œÇbğîÔé©_‡{ÕF<<3ª:%ºÙHVëYS\ná%L+{”o.>Z(´Qk¢ÖÂN«!Ãì,‰:rH}nRÒNkI		ª‡[ò´Ìë’Ó§gÎÎÖ¤;mYÒ³g™%ñ9V~-J_³ñg²­•©Ë\\–É®£Q\n®–!õt«\\UY-tZn¨¡d:Bµ°Ê½Ü*í]')t“²¥wÁù–É«[BUm*Úr4†Ø–Õ*yv¢¶ÁvZÀÕ¹+GHÎåZn°PÂÜ…|\nT¥ %#\\·AX\0}5b+wr«XwÜ²1uù×%Cg=I­òv`creË0`..<·êğh‰+ŒHÌ^\\j­yFòİ%Ê]¹BÊ\0ÉrÅ+€> %Zx¹š æ%C.ªÃìÄ`Vn­1KS¾¥Îk\rƒõçX|´õ[Ì;õ6H	U@©D:Ş»Mj	Î•ÛÊ?ıª]Ú¤Øˆb“A+ÔÅG£\0thxbşÆL`”ÅÀ64MŞ›ÄôŠY#ºhfD=e€Øw=´c˜+H…ñ¡¡:„.%ü^\$òDZrAzjÿfLl›7’o¬Œı°Û\0¨-äÜ³EdäŞ‰yz'V ­“Ó¯W´	Zö§K˜+°d(AÌfyŞP?‡xRš^hõ…¸'•æàA\0ˆ¯:p\r„d(V±ŒÜ½šdöt	SîFcHÈŸ¹]r¢rÊCHY	X_º/fƒŒİÍ½ 4 7eÚ6D³{,ÑèşêØ<<Z^´İj\"	éµ\n+Æ€M…Y9…’A‚(<Pl¤lp	“,>Ğ€¤{E9Ü&àGhšh{(ı±Agg8 (@ŞjTûnËg€Zã†ÙÅ°ÁJˆÁŠ³x¦˜Œü¼@ic¶àÕ‹ô(pƒ'oJ0MnÄ€í&Ê§³\r'\0Õ‘ø„\rqÑFè4½°Š)ı½cL˜§ş_ÀoJÚ}5ïÚc–o¨àà|6„m¾}Qª£á4QëÇb„·µ[úx«m( İ&µ@ä;Â+ò˜¥®ÚÅf|IÎàõ”RĞ48… {	`øè®çk`u»r`èWã¸±`\"´)fI\n©Ô;ò8ZjÍ‡–gğ~¡šAÎˆè!j¼Ä%ÄæT ÂE\\¯\r3E“j‚jê¢FXZ	âÏAyækH ØXdğgCQ“–±´áÎ€ş0ğd”ü²¨°ïû¡†út¨	œÇzkÀ`@\0001\0n”ŒøçH¸À\0€4\0g&.€\0Àú\0O(³ÈP@\r¢èEÄ\0l\0à°X» \râæEä‹Ç8Àx»¥›@ÅÔ‹Ö\0À¤^˜»±z@Eğ‹æ\0Ş.¤^¨¸Qq\"éÅà‹æYäÂD_p&âÿ€3\0mZ.Ppà\r€EÏ‹÷sˆñv\"éÅá‹ç0´`ø¿wâñÆ,óü¼_¼`\rcÅâŒö/Ô]x¸q‚€€3\0qÎ.p˜ÂqŠâğ\0002Œ_ì³i„ˆÄÑŠ¢âEÆ\0aŞ1äbÀÑwJ \0l\0Î1,`ˆº1y\0€9#?0T^ØÇq‘£\$F6Œ/\$d¨¸‘‚€FDŒyJ0b˜»\0	ªÆWŒ¾\0æ.œc¸Â‘{c EØ\0s†3l]@\rbùFŒ\"\0Â2ô`˜Á‘’\"ñ€7‹µÎ/à\0±š¢èÅÓa	^04e¨ºQ{c<ÅÑŒÉj/_˜ÁÑc\0001Œµ*28BAàã\0000ŒxÆ”iØ¾1˜£F50ljH¸‘™\"éFŒ30\\_ˆ¾q™\0ÆfŒ¡T³l_0Ñ‚£BEÄŒ#3ì]øÒñs€Æ½‹Ó†64_XÀ1–\0Æ½‹ñà™d`ø×`\r£SÆ_JMV/f€±­€1\0005I6tf€°ã4Fª‹Á¶34fà‘ ãF-‹ß’6Œd‘±\"÷€4k½„\$h¨Â± #EÅÌŒú\0Ö6¤_01—c@F‹áª/d]X×Q£#G\n‹÷†5¬g¹q‘ãEF\nŒm\\ÂDn˜Åq½£YFv1/4`øàq½ã€4=â8b×q|À\0004‹‰3ÄmXÁ1‹£e‘ö\0Åî.¬\\èàQ—cIÆ	·.7ü\\xÖ`\"íÆ\0i^3ğ(ç±’ÀÆ\"Ev4l_ÈÈq®Œ\$Fñ‹±àœoÈ¾ \r#UEä©^9ütˆÁ‘¹¢ïÆ.\0Ş3|rÈÄ1¿\0Æöù69l^x¹Ñ¼PF-]\n0ÔvˆâQy\"íG‹³2,sxÁQq#™F+Œ\0Ù/DiÈëq}£ÀÇ8[6,jø»\0cmÇo×N5¼ehàQv£«GL€H<T_ĞQ®£?FÉ‹É..\$føÛÑyãšE÷ŒC2Ül¨Û1s#ØEéŒD³lohÙÑ²£j ‹²Â8Ôe¸Å±ÔbğF!õÆ9Ü`xÓq¨£§–CÆ7ÄhxÕÙ£ÆÅ»ú7œ^xÍñğK<Çhƒø	,uØé±‘ãG)Ú;luàÀ#îEß¹ş<ükÛÑíbşÆÜ\0sR.¬w¸Ö±#zÆ~w’2|x(Ú÷âğ\0001'†:Üv‰\0001‘ã¢GæŒ¿¦?|`øò‘£‡ÆóÛ .2¨XÜÀ#“G¨8KÆ@<z¾1–£Æ¹\"9|jˆÒÑĞã	G¤/æ6ÜqˆŞÑö€GÁsÖ7ù/\0001‹büÇßí¶:|ƒ8ÚQÚ#~F»W‚4ég˜ÌÒ#<F\rµ š2üƒXÁQÌ#ÿFvkî7´xÒ1Ú#ÎÅÆ›¦@¬rhÜÑÀãêF”íZ;¬fÈårc¿y‹‘!\r	ä_xë1¿\"üH1Ï¶0TwèÙ²c\rF1 \n8dX»rãĞÆÔŒ§Ş2Dbèı±{d4HˆŒrA<~ÈÙ1±dBHI[J?¼¸ÅÒ£qÇ~kº0ÔtØØÒ#„F\r#0\\h¨î\r¤GÈí’EttØè‘íc7ÈUŒ¿!Ö=D_ˆèòcNÇ\0‘yÖ6aÙñë¤ Fgç!v1ÌqØÈ1ØãKÇ‡»â@äeè÷Ñ³cGoó\n/¬ŒøÆ²ãˆEã‹Á\"3t`©ñö#cHµ‚<ÜcøÓqâüFî%†?Tbè¹±°d)Ç‹© r0‚øÌñqc¿Eøã>3\$tyQÒ£…ÉE’Cl`9)¤VFHMJ7”føöÄ\$HHQ ;üri’7#F³-F¤HÆQ÷#\0G·!‚1ä^Èş&4¤vG&‘û7Ôgèà±ƒ\$\0G\rr/ÄdÙR¤(Æã‘s6@¤“Ù'RAãÇ¬›È”Œù&‘¢¤–Çg\0k z=´|HÙ±Éã‡ÅàŒÉ^J´]ÀÑsd¤Ç,\$’1”¨à<cqÇ¦’ŸêJœ_øÏÁbçGˆQvJ´¸Ø±ŞãH5Œ¢FôpÜÀIc¬È[‹‹Î@ÔrÈÏ¤vHå%ã¶3D”¨Çòc<I\$M.d—Ùr1c=F÷.4„cˆÕ2béG.Œ!¦L|{X×Ñ³£{I«NFôdx÷qscŞÆİ¿#şE¼a)‘Ñ#¹G”ƒJ¬m¹.‘û\$=Gh’AN=¬s‰ÑÅ¤EÍ‘GşG\\a1ò0¤ÛH¡‘ÁF.tg8ê‘Ã¤[Èòÿ¦Idn¸şò8ãF€‹ÙÖ.T’¨ûñ·€F3‘Eº6riq¸ãsF¼Ö6ÄxºrãÚÆL=nFTÒod Ç>-ª3ô|©2\$ı0„‘= â:‘xc’HËI\"NP\$b¸ÛQñ\$Fñ ®DÄ‚˜æÑïä}FêŒ%ª?äŸ(î£êÉG”3\$‚O\$^xÂ2T¢éÆñÕ0Œ¡ğR’‹Ì#ÈDŒ:„òE¤|i/2Œ£XGˆ’”’8¬•¹-ù\$HÉv¥Ö=dš‰ è¤Ç`’ù’:laxäÑú¢ğI¦¢:ì—XâRJ¤Òñ”ÒRÌmxê’J#\nGG“9!N¨ä{cIõ’Ó&æI¬ éR=£€I\rŒù&j:ä‘8ÃÒg#¸H‹á'3„_x¸²b¤H}”£>7ƒèèñŠcÌÇÙ\"&K<xØÊ2¡ãçH†‹¥\"6@dbèë±­e;É)Œ!–.Ä]ù/ò‘d—Êm*f6,v©—ÉªÊ‹£ªLäÉ(qµ£AI8”7d„9TtcôÊ’‚UL•XÈò%H¡”I*z:Ì|IXqsá¨ó-ÂBĞÅäq^(•R¼»aq(~eÑñ¯§ 9JèU‡+-eq*nTà­Ğ>¡\$ÕÑ«er’•Î±¡p\nÅÕ¼Ë\$es+îV£IšºÇb«øeq:ß#]•cc®7r\nÙf,gYø³TC²%Œñ	Ô}Ë\0–²©\\*ìEWPæaè:ÏE¥,&WòÆp)Å¦Ëxl²MáÂÄ3\0t\0¦/IipñD'\0	k\$T¤¬F‡¤]fºÍdMòÈ€K\$”¼ıH(@îÉ”‹»(–zµnWÒ¤Ù_ŠMİ”*º\0¦eÙlF™^H	W*B––ZPe½ÅÖ˜‡ÓR/dRÂ—RÊ…\0Ku£,yH)¶\"SÊXI'®¹Zƒ=çLøRå3åÄÒ\nÀ'š[kğ­Í6@;}R”íıI²ò³ô¬_é) wê‚[óÀ û\nß´n–ª¼ŒÊ“bBr¸l,\$vÖíÍİÔ°‡ˆÀÕH©à‡…\\¢‹Ùs*È ºå–.Qt’B…ºdˆb‘½—@ï?3¼S`a@¤Kª\\.«´à~Çfª)¬«¨ï,?|&Ó¶KÀ£…Z9.İX³+S‘â|ÀœØ\0PÊ¼¢ŒE“òçe‚/Ê\0VëÖ^KÄ\0\n-	:ËÉSØ²)×ªû0j‘9TX•åBğƒ½K\"åÅ¯±•Â²,2Æ'‡2ËåÖ˜P,¡xŠôàpÀĞáKê—ª´š›õ\"ÊD¢#TV²œD¿õ1ñAo;Ø•×/9TH%V`WJ<9˜¯aeÊ° K/V^/¨Q†¤Ø\nBñZ\"9íËÆXÒ¯M~\$°5„ŠßÚ\$0dè½I€U“Í³2¼^X\n¼*ãE7I\nV3«–…+ÎaŒÃIiÒÒNËKK˜g0’aŒ°„z*“V©º#bJyMÒ¦eõâZ– …V ¢`’ĞòĞU1ËC˜Ÿ.\rF²ª-jÎ&LU˜p§9s‚é¹Š+Q&1¨âRm¥ÕÓ±gZª²–	,.XryZì²°0¨ÏÜ3¬2˜A1©Ö‚’e‰Nû©¸˜ú²(?Al ŞÌ,Nèue²Ï\$|rùá_%²ñE05E}³\$¡Ü…X2«%ÚZªe €\n\";<9a¾hã¶¥àa]úÊì™8±à*éu¯åÁªL¥¦¶±dR¿ğ0«¸Áª+ŞQm.ü,Gù–«¦M®ï_±2åedBêÍİ¸,°S…2Á²>UÕêëÔ°»4vlë~e2©ò2¤eÄµËYg2nf’=Àş\$%óÌÙ–Ffaìµ)‹ê§å”ÌfTÆ¶áG¤Í×g2ºW,[™šíÊX>)tÊA]œº™R*º&Z·Å6j2|‘¥\0 °(©p	ê9× ÌùuÒªô?ôĞ`nåœ-lZnë!H9²çæzLğš¢9VLÏ¹yÒĞİ¢ZØJhR›‰g“EfL©UŠ²~`4ÍYˆçæx)\$B±QR#Ã•Sê”¥ËËõ,6i#ÀY¦“,;C±šr¬âiÙ&ÇXªû]èÍ\nw54­K‰x\n*&©Tš£îWüÓùŠ“¦©+SĞ»qNc·yóIWä¯Û\0W5cÔÒÉ«‹ğ&+š¶ğVrå)¬êÎ£Kgšª¾Ô?‰ µŠ“¥|«gR¦¯†hR´%Kë¹œ)Z#‹5ä,Öµ–k…æ¼»`šìl:à•LsC”[M‰UB©6ldÑÑ“J¦°ªŸ•ï1nl:ºù•j¦ËLß–¢\0®hã¶ *)¥p/®šŞ§5\\”<9´óV¦…/‹šŞ«®hTÇdjµårMbx\nˆ]R¹çWªR‰ MaUµ3=×µ`0³oÈË,Z™¬³lÀÅ}Èó¦m¨ì›”í²lôÎ´ÕmLåS6ê\\’tÎ™¹òºèL—îÉ\\Ï%‘J¶”ƒKå™ñ7oÑ©Ÿ¤ef€Mš£’oC»Y¡“væ…­NVÃ4=RÑ¢sJİÉÍö¬¶*hÔÕéhnäæ-m›é4‰ß4ày¤óHñMû›|îÊis¬U=ƒİÚÍA\$Ú­òi¹Ï™¾“…öÍ>–êîÊpâ¼pûóQfø«îšÀ§ªq,ÔÕ5sŠULùš£8}İ¬ÅÙª“Œ÷#ÃXH±ÙİìßI««î§¼9Uµ8íc:³I»îíf´ªĞ±7Òklä5}Ğ÷f¹LY•ğ¬áN2Ş°ó}&½	išê®ñc,åI¹3‹ÚÄRœ©6räØ‰Ì3b¦ûÍœÇ6>lXY¿ûfıLœ)+ÙS,Ù‰Ì*ùelÍô™U\"edæº\"ZçªÚ–6’ZDßE9°á%ÈÎ‚›Y9rmtãEĞó'.M²[4¬‚^„åÉ·ë;M»wÙ5…×Í9¸Òóa¬¦v+70lÍÉÓÓd%£Ì<œù3Š_<é•lN²¦Š(€v+7YRlÎ…Óª]‡.•Õ4©I³®)¼³=ÖƒN®Tš]Û¹'U^Ó?çS«¼½7¾XC®Å©Ó¨Õ1Íu¹9©E´ß™²kçL;œ¤NhÌìÀSİqNXk;1[„ÒõÓLgpVœBî1_¤á¥ÎÅgs¬ š;­RlîÕEˆ×ßNğTÇ8öw,îéÅs¯•1ÍPxrëŠq”ê‰ß3¦¬(ª;ñZÚı	yÓ¾'{O	_´¾êrï™ÈªMg|ÎIó92eLçÊó”f¼O\rYŠnkÜåuŠ™”SNÉv9Vkâ“	Ë3Ç§.Ì›v9zydæ)á“¦ÈNĞYì&s\$ìùÍjd'6Í”œQ<ÍVÜç)èeç+Ï›§:ÑØ¬êYjt¥¡Ãp‡u<±İÊ–Éß3¢]qM°Y:9XãµS³¾gI«Ã*¿mäÆÄCëùıv GßìÜR@ÀÖ¯¬jT—=¨:e ÛÀ(\0_Vn©,?p	3Ş'Î ™¸¨‘Ø™ïÒ\r¬†•¼ö|\"ŞiğºgT’nşPçš¤°\nÓ”åq,ÛSf¸.YĞµQ A¼A‡,ZÊÚeSå›˜sEÀì\rú‘v„T‹¬QŸZ©\"pó²IósëUAÏ›\0¾ëvZ¸}®rÙ¥KŸtféPäf9ç–®¸{¼¶^J€çßÏ‚Ÿ”¿šø©•\n0%«€NGÚ«*~lüD.»¦ÎKeŸ¹6¢[,Ô%ÀˆğOÕ˜É-†~ìµ•–óú¥j®ŸRO;úŒ@	Ë¨en›b_¾%sK¿Åœë‚ÃïYÿæºÎYÑ0ü¥ÃLËWª¦jrßÕóèÏ† ë©!BšÙñ”æ„Pv´£fwÚ«Éø€çãMÃR2´2€zŒ4rúh;Ò#M@…}…\0‰|ëã¨MÃ\0…=Ú=å¡àf-!Ÿ6pÊ g[P4‚´†ÌìóCÚ[5:–‚\rµCt¨ÍÃ u@ıÛº<éŸäif„ĞNu¼n[ñ!u8j{&9Ku FQlR“iÀ(ËC ÇAä®™s4ˆë\0Y Í;fƒB<Ô{”å˜¼R_Iš~š…6ô×|MWTAí]4÷e@J­eÉP|[ú¨–r5*Áÿ—OÎ íBt½)¤ê¯%Ğ-\0Pªjm	usá§}Ğ˜Ÿ“Bi^©Ú*¦zĞ0YK.ù`[¯Yû2íÖĞ«—|°XBÑÅÁÓÁ(?Ğ—±.\$“l¼’³,æÎX¶DçÍ\nêëjæ¡OD ->_<¼¥ÕÖ‡Ù\0š£ÙÕ¬¥Ásøh\\…¡•ea\\Ó\0Êöeä‘™Yµ`¼¥´7UØ\"e¡ÇCYTìñÙzt:V9P™_š³…a‚Ğ•FÔ;İ€\0MŸ¢´†…2“eúëHCéĞóZ‘?îVò¼åœ'×¬å‡ä³}c¾Yüaõè„¬åı?Qh8	ğ´0•Q‡CM`ºŸ«ó6æø,‹Ÿ¢J‘eZ¾Z\"G—Wª¡u†–u\rÕ>49èKı—ğI%L–¹ÍİV9Ïü˜İÖ‰´øZë{VEOÄX;©áÑÏĞoàagPÂ\$\n²RX@}!-Si€òRª¾¢qzÖ	öêITH.¡Ôí\nk\nïš \ndÏ®˜Tº‰²>Ğ\nîÂ– ­?£E…`²Ì5D+f’?#z³…IZü7T[¨€Qs#ùDˆŠ\$«ÕÏPù¢ìI†	û3¾×*¼:İ9YI²ãH‹³ÔH®¬X«0åDŠ!u7J¸–m® YB}Eª°Š³¿—ç®€¢òr”8Q•ù\n}'PõSâ²	Q±Ğõáú¨‘°\$§Å`RÇ)^áõ(O€P\0®aK½µõômè3¬Š\$H.„ùX„ëñÔç)ĞV®™`”­Ú9 ¨.®Y™‘18âÚeUÁ’`Xç9‚´	Œğäç\\Lcˆj°IE Né«ª¦6€W¡D¦XBØ	Z‹:”|Ï¤:	E-P-Ú&ÎÁè¿)ú†ğ§ˆ*ÓúÔlÀ)PÂuŒy|R°³Lhÿ.p¤§é_* QA †@ ·?,Æ§êYêÖ)t‚Ñ‡œ<íÁP*êåÜj’VuQş:2\0L¸?JëçèÑ,TPHL²ÁúE%–¬\0ª¢yP(YJZ¥î©úTHÅX\r	•Q4hOÒ;\\vVõ#åÀTWw‡ï\\`õOÒ¡Å«?ÒJR2³ò’=õFóâ]»ĞŸI5TMjIë9é,(Æ¤Dv|tÉ)ŠWy-¦]z¨Úe‚Œ‰a,pQ6\$ëI-g=%‘SÔW#íTP§Ü¤É)«T&]ŞÑõX15j†”B8„„æVÏÓ¥\nìem y“”h›*è¤ü»„°dç4Ï‚·bd!0¤gR”J\\Í ÖMtƒÀ1R\n\nïâxè¡èÜÁª.ö_¾üuò+Æ¼Ç;ı‹*4ˆÎ¸)]À\\¡lÜ(m\"ñƒQ†nTˆ(*\0¬`ğ1Hì@2	6hàêYÀcH_ÌÚÈfğ?°Ğa«–7=KKdeÂt÷HàÀ2\0/\0…62@b~Ë`·\0.”€\0¼vÙ) !~º€JPÄT—Á½ô½’–…µ¥óÂ—ÚOƒ{t¾¾\0005¦¾˜/à¯€\r©ƒÁJ^ğ½0Úa!¶)€8¦%KŞ˜PP4Åé~ÓH’˜á÷ĞÅô¼Üí\r+¦Lb˜¥/24)“Ó¦GKê™e0ŠeËé€S1¦B¨	-0jfÔÄéšS¦wLÎ™Äiêd …é Ó¦Lºš\r1ºhôÈ©œS ¦—MJJÊht¾)¨Ó+?L¶še5n”Óé|FHŒÉMN—õ5êjÔÉ©™SH“ÕL–—å4É=TØé´ÓD“ÕMnš½6Zm@I@S`¦)'ª™Õ7fòz©ŸSz¦x~OU1k”¿¤õSF¦ıMOU4ªpôÙ£2\0000¦ì¾7…6ŠkÑ#xSl§'Kâ7…7\nl”ÍãxSu§LR7…7šstßãxS}§GM7…8*qtÓ#xS†§OM\"7…8ªuôë)ÆÓ\0¿’š•9úr™)ËSr¦‰2šı; ôğ)ŞÓ7§Nj›m/Šxç©ÕÓ¿¦sNÚ:jy4¿©àSª§gO:1ı=\ncTö©§SÍ§•’œ•;ê{ñ¥©îSÈ§/ORH\r=ÊtTôéŠIİ§¥O˜¤\\zx4÷©Sò§‹MşŸ•>j|TıiºS¶‘³O†™¼š~ôĞ\$lÓú¨Oöš}tüÈÙ§ßOî˜¤šzÔû*%§]PPüšvU\"úÓİ§¯Kâ í@\noõjÓH¨;P¡>š1£éÿFd¨P.5BØ¸•ª\rÔ¨3œuB¹<µL#Ô<¨QPECÊu*\nÅÛ¨yPN¡´lª‚õ\r‹6Óó¨?Kú¢mBZi•jÓH¨›O2¢}1J‰µé›ÔM¨_Mş¢mDŠˆ€ê&ÔK¨ÇQ6¡­Fzv´ğ‹6Ó¹§éQjå;jµj)Ô*¨Ş¾£mEÊŒª9Fd¨ÅQv5eGØÉµd¤Ô„¨EM\0+åDêƒ\"j)SD©QÒ¤pZfµéÆ‚§mR&¢ıHŠ’U’Û%§{Rv0m0z”¥ä§ŸLÆ¥@ú”'ÖÔ©ER¶?eJ÷>é¸Ô¨İM’¥µIú•²ªYT¦ÛRõ/¥BÊ•.êUT»©YRÎ¡L:™jNÔ…©•Rš¡İLú˜5ji&,‰Oê¦mJDß5,ã9ÔÀ©­Q¦©Íè•1êhTf©›NÈ˜ÒÑŞ¥Q€'©Î7¾§Lih¸²\rcjÔŒ‘Sz§ušŸ\0nãÔº©g¶§Ø9Õ@cÕŒ\rT§%LÅÕAªfT­MT9uQ\nŸÕ)¢çU©µSº¨uD:“±—jˆU	©­Æ¨…PÚ–q‰*‚EÚªKSb¥l\\Ú¤µFª”ÔÅªGTz§gJ¤µHªSFª	\"©½Q:˜1‘ê›Õ©;†©½Rê¦µL*~EßªoTÒ¦\\z ‘„ª¥Õ:©­âª]Sê•±Ÿª¥ÕBª“U¨^J©uR*kEõª	ªıTêœQtê¯ÕR©g2ªıUj«µV\$ÅÕ_ª¹Sˆ³mPHÆU\\ª±TüŒ[UÊ«5JhÙµ\\ªµUpªÙ¢«•Vğ7a_*€Ó«¬=R‡>\0I*¼¥ô”V«íX:hU8jÉTæKZ’¬\\:ƒÕ)jÇT·«8˜±	åWZ³Ub’òJ8«R­=Y³UVU–«R¬¤\\:™Õ-jËÔÑ«iV.¦¥[z´±ÒªÂÇ-«{T²­ÅZªuoj×U»«3 ¡Í[ª±Õ>ªØÈ«E ­%\\º±µh#bÕ…‹©WZ®-\\º¸õCêæÕ«»W>¨­]Úºg4#¶ÕÀ«KTr®íZÊ¤wjãÕ\$«›z¬-Rj½õtjĞU*«ßWš¬tp\n¾4õ€ğ'–N•Mº´²ªxUş™X32[xò•+®“Ë\$B°US*½õqê›UÍªqXZ®}SÊÂÕxêÁÕ@¬-W\n5İXZ¨Õ…ªãÕJ«›U2±=\\úª‰ëF+«ñV‚0]XXÁUŒªìÖ0«¬-VJ¹²+Ö/«É‚±ÍZÊ®5sj¹ÖD«ŸUŞ²%bØÉµªÁÇ÷«V²%Yš^u@d¤Õ¢’“WĞæ„”šÅ²Rk&œŒñYR¬\\¤Å’RkÖY©cVÆO-\\š—	kdòÓáKoX²¥KÊÍ/ë9Ö]“ËVªO-U‰<µ™@İÉå¬¥VÎ³[Ÿõ›«6U¹­—Â=eŠÏµo«4Tİ­Yâ0eHÆÕ¤ª\rÊÍ9«¢•¬6à(ó®•+7ÎybÓrI §|Ä\0—:FzğÉè\n…§|ªœs<°R½%JÓËÔ]¦õFèµ3õ­Œ‰j¢Î£¹Y®µZ“¾^<5X·IJòÅM`×nO\\£B&¶r“õsÅçQˆuz¨¢x¼å¹è	¬Tˆ®¤VwÍJ5¸g	Ï?v¨qF4ï•9³Ó·»­Õ6ªzjùèÕ‡OV•¿\rÎuÊ=Â@Ê’fTÍšœğïöy´³	€Ö«pKaXU9šm²³…­\nekMo›Ã5\nhTŞ†ê¦¦…V ®¬v€‚ı:®Ñs®\\p>ÁÒLÓ:¦‹)ñ­O=nk}j¥Sõ«&·Ö®ª~µŠ¤y©àe”¬ÜšßZÖµñ)jØ®”t×VR¢Vµ½sµrÊ:+aÍo­‹,!TılŠUÏ•Ş*n­›5¾¶\\ğU÷dv+’M\\®)]B¶|ñJë´¦l;4˜¯5öpLÖùÓµØ¦7Liı[~bmtÉæSe€\"»°›Bº½v©´d“ç@Í§SÁ4)Ø’—Zï¼»\$)®ñ5ic!™µ´¢½ÎŒ–êî\\Rù*ßSD¦’Îw\$›9ætSÁ\ná”GfòPÔ›ÆîÊ¸´ßÚã*¦	KÍô­D·Vyû¹5ÍuÈ¦J×‘š\\šµC¹•\$“ÙW,¯M\\º»ôåÊæ5¬ëÓ–®k^•VÕsŠè5®k¡Ö»¯M^êµı{Àu°§Ï¤wFQàßJéHûgWN¡k8şºÍŠôÊ‰+¸»§˜¥1brÄíùË•ØëÓVÜX]dLçjí´YT™Îv®ç6–twyË•Şkò×ë­à«vx=…5àh»²ï½ô8—]ÊÁ‘ñË·x\"c|ĞufUÿƒşØ\0˜Ò§5ŞjÈ©}”PknÌšRl¾‰fÙªà+ò“ÑÛ£‚¢>c4Æ×W+TıDo®Òï ’Ç÷qî¯É€SX’¨İb}}Åhnµ&<Ï?™/3º”-Ã¡h†°©qn‰ı§	õpƒ%)SÉyP\r…ÛÍµÿm-Ïf5°Šº[€\\–=ÌTà}øy )ıç Ydç«Ø¤46#Y>¥3ÔŒ× šm©ú\n09h;²4˜°Â0‚Ã+ßae\nÈƒÄ°È!ÊÅüÑ)‘@ôx¢x}‡\$¦ÖßıAFŒúÃ‘²0Nö Rã	º°şÓ„èiÜ¥ü¬U¬?½¡—b5í!+×­\0G˜ıØw{¶îÓ¤—ïlI £)’w-4;p8ÂÎØ¤;@\r\n\r­…ÚN5Æ…F\\Ó¹hgPE il0¦ëX¦%’)\nˆØLkÈ^‚Æ2¢İ<5FØìd‰Iƒ<ñFÆj³bM¬d'á	¶Æ²D£âîBma²ĞÒö…ıOYñXgg¼8¥çZVØ%mf¬Ô%å€F¡-¥,É\nƒ‘ıaù¤FÇwfƒôs¹ç¬Ê0Gä¹‘ØZ²\n	1†;Jí–1Á\"iPñBÈy´C¬–Ìû²t—zÓ‰ãÑÖ;l‚4âÈÒ¡‚ƒJ‡”mLX²+lá˜ªõ{Â8¬\"â\nÌVÁÀšÄÛ(Ú\$Y\0íd\\İ†6›D9B´H±d%¦Óî–1ÛÁ˜6f Ñ\"ÊTJÖÚ`/²‡>ÊC=Äc“ì¨±¼²?e!ık*±3l~ƒÃÓiÿ«,×A‚z/dà¨¦MoìÅí´Ú²nÑ\"É½„ÍÂëÆzTr}eÙŒ{MÀaCÔ7‘fiTºõ—Ë/6W¢©P²ìÖÌ8†Fa`İì¾5³ó©¹M…f2V]œ['}cn4]h·íÖe«¦‹Z€Å§\r™‹2ÉÈ½XllGa`(­™—Û(‚ŠÄò\0èÄıšĞ_ölO˜ùf&fÄ1c8ìD{¼QæÜ	S6öp\0äYÂ˜æ¹˜™î\0\röq…3m&*fÎ;Ìpò6r^cŒÏ³¨—`Éµ&z€n^Ú±ù;DÈèSã¤oj^ã=¿L'g”5œ“Ä&ƒìä‡Ef&ñŞÏ|\nK 6?bX*¬.fÏˆEƒû–~&9Ù!˜çdŒk@‰v\"F¬Gšx\\é=ıEŠ7ïXP2[:Á¶\0ƒ×à¡ X~¦½7·ÍâX6†4²œÉ(Ã\";Bì\nŞıX×Ñhy¹Ì&›DÖˆÛZ¼l\nKC–‰íšŸ†pØ’Ä`mS®	2ĞU¢;Gà•‘8¶´{’Ñ-”±WBmì¸\$F€ø\ràl&B‡Y2\r´¨mAÅ‘°wÄZØ6ØRĞ’¿Ğ%d´ŒİÂÚ_²œTô5¦``BaĞÙG´ÕcáXKö\r¶˜\0­ØgN¼ù\\‘´¾;Nà¨àÄÚs^\nŒÌu§ä¿Ÿ­Ñ²VwzÄU F\"\0T-±,^’Î\0‹Îö—è2 /æ™ óÂÏàEW/\0Â¼ò–ÒÄ¾Ë4;\"ìK-NZš½ĞMcÎ»RVNeœZ¦wj–ÂŠ6ë¯a¶÷yÌˆÙç»‹KV®lN?±Ãjt2­–¶T/[íN¤û±j|0t% #°”€âÑ\0ôÓ`£ø5F<–´ƒ X@\nÓ¢Áí•ËZF\\-m›¼³cd2Äp5Gºv'Bß'¢7{kŠ*'LÜAªZ|I±k´\n-.C¢6¼«¹Çk•-¯×©SÚú°÷kÑ]¯Ë_\$…Ú+Gò× [^‡­­z]kÑÑ8›\\ö¿F|§¢?BˆØÁ^ÏB¨‰Ì|ñ™ë@Š­Â÷B¯¥zPéW/R?[!bB–á¹kÀ‰Ñ '	(ãe:xfàr‚7\r_íâq¶Maê\0#±ä7|éQ&\0É@)µô†À1òë®†LA[PtÀ\0œ™ı`‡6Õ\\e‘Ÿ¶zxÒÚSİ€vÕˆÏ€U:Ú±¿T¼Á‡ˆÏ—>fÛ\nq‹l€Å+K(|¶\\´Ñ G›UØ‹³Æ@(ğ*ÉiS%F¨\rR\$©•C¶¶LĞİÄö;ÉdµìÄ¼gë-\$m?ölhÊŠ3?PªY\0");}else{header("Content-Type: image/gif");switch($_GET["file"]){case"plus.gif":echo"GIF89a\0\0\0001îîî\0\0€™™™\0\0\0!ù\0\0\0,\0\0\0\0\0\0!„©ËíMñÌ*)¾oú¯) q•¡eˆµî#ÄòLË\0;";break;case"cross.gif":echo"GIF89a\0\0\0001îîî\0\0€™™™\0\0\0!ù\0\0\0,\0\0\0\0\0\0#„©Ëí#\naÖFo~yÃ._wa”á1ç±JîGÂL×6]\0\0;";break;case"up.gif":echo"GIF89a\0\0\0001îîî\0\0€™™™\0\0\0!ù\0\0\0,\0\0\0\0\0\0 „©ËíMQN\nï}ôa8ŠyšaÅ¶®\0Çò\0;";break;case"down.gif":echo"GIF89a\0\0\0001îîî\0\0€™™™\0\0\0!ù\0\0\0,\0\0\0\0\0\0 „©ËíMñÌ*)¾[Wş\\¢ÇL&ÙœÆ¶•\0Çò\0;";break;case"arrow.gif":echo"GIF89a\0\n\0€\0\0€€€ÿÿÿ!ù\0\0\0,\0\0\0\0\0\n\0\0‚i–±‹”ªÓ²Ş»\0\0;";break;}}exit;}if($_GET["script"]=="version"){$q=file_open_lock(get_temp_dir()."/adminer.version");if($q)file_write_unlock($q,serialize(array("signature"=>$_POST["signature"],"version"=>$_POST["version"])));exit;}global$b,$f,$k,$mc,$uc,$Dc,$l,$od,$vd,$ba,$Sd,$w,$ca,$le,$nf,$Wf,$_h,$_d,$gi,$mi,$U,$Bi,$ia;if(!$_SERVER["REQUEST_URI"])$_SERVER["REQUEST_URI"]=$_SERVER["ORIG_PATH_INFO"];if(!strpos($_SERVER["REQUEST_URI"],'?')&&$_SERVER["QUERY_STRING"]!="")$_SERVER["REQUEST_URI"].="?$_SERVER[QUERY_STRING]";if($_SERVER["HTTP_X_FORWARDED_PREFIX"])$_SERVER["REQUEST_URI"]=$_SERVER["HTTP_X_FORWARDED_PREFIX"].$_SERVER["REQUEST_URI"];$ba=($_SERVER["HTTPS"]&&strcasecmp($_SERVER["HTTPS"],"off"))||ini_bool("session.cookie_secure");@ini_set("session.use_trans_sid",false);if(!defined("SID")){session_cache_limiter("");session_name("adminer_sid");$Lf=array(0,preg_replace('~\?.*~','',$_SERVER["REQUEST_URI"]),"",$ba);if(version_compare(PHP_VERSION,'5.2.0')>=0)$Lf[]=true;call_user_func_array('session_set_cookie_params',$Lf);session_start();}remove_slashes(array(&$_GET,&$_POST,&$_COOKIE),$ad);if(function_exists("get_magic_quotes_runtime")&&get_magic_quotes_runtime())set_magic_quotes_runtime(false);@set_time_limit(0);@ini_set("zend.ze1_compatibility_mode",false);@ini_set("precision",15);function
get_lang(){return'en';}function
lang($li,$df=null){if(is_array($li)){$Zf=($df==1?0:1);$li=$li[$Zf];}$li=str_replace("%d","%s",$li);$df=format_number($df);return
sprintf($li,$df);}if(extension_loaded('pdo')){class
Min_PDO{var$_result,$server_info,$affected_rows,$errno,$error,$pdo;function
__construct(){global$b;$Zf=array_search("SQL",$b->operators);if($Zf!==false)unset($b->operators[$Zf]);}function
dsn($rc,$V,$F,$D=array()){$D[PDO::ATTR_ERRMODE]=PDO::ERRMODE_SILENT;$D[PDO::ATTR_STATEMENT_CLASS]=array('Min_PDOStatement');try{$this->pdo=new
PDO($rc,$V,$F,$D);}catch(Exception$Jc){auth_error(h($Jc->getMessage()));}$this->server_info=@$this->pdo->getAttribute(PDO::ATTR_SERVER_VERSION);}function
quote($P){return$this->pdo->quote($P);}function
query($G,$vi=false){$H=$this->pdo->query($G);$this->error="";if(!$H){list(,$this->errno,$this->error)=$this->pdo->errorInfo();if(!$this->error)$this->error='Unknown error.';return
false;}$this->store_result($H);return$H;}function
multi_query($G){return$this->_result=$this->query($G);}function
store_result($H=null){if(!$H){$H=$this->_result;if(!$H)return
false;}if($H->columnCount()){$H->num_rows=$H->rowCount();return$H;}$this->affected_rows=$H->rowCount();return
true;}function
next_result(){if(!$this->_result)return
false;$this->_result->_offset=0;return@$this->_result->nextRowset();}function
result($G,$m=0){$H=$this->query($G);if(!$H)return
false;$J=$H->fetch();return$J[$m];}}class
Min_PDOStatement
extends
PDOStatement{var$_offset=0,$num_rows;function
fetch_assoc(){return$this->fetch(PDO::FETCH_ASSOC);}function
fetch_row(){return$this->fetch(PDO::FETCH_NUM);}function
fetch_field(){$J=(object)$this->getColumnMeta($this->_offset++);$J->orgtable=$J->table;$J->orgname=$J->name;$J->charsetnr=(in_array("blob",(array)$J->flags)?63:0);return$J;}}}$mc=array();function
add_driver($Gd,$B){global$mc;$mc[$Gd]=$B;}function
get_driver($Gd){global$mc;return$mc[$Gd];}class
Min_SQL{var$_conn;function
__construct($f){$this->_conn=$f;}function
select($Q,$L,$Z,$sd,$wf=array(),$y=1,$E=0,$hg=false){global$b,$w;$Zd=(count($sd)<count($L));$G=$b->selectQueryBuild($L,$Z,$sd,$wf,$y,$E);if(!$G)$G="SELECT".limit(($_GET["page"]!="last"&&$y!=""&&$sd&&$Zd&&$w=="sql"?"SQL_CALC_FOUND_ROWS ":"").implode(", ",$L)."\nFROM ".table($Q),($Z?"\nWHERE ".implode(" AND ",$Z):"").($sd&&$Zd?"\nGROUP BY ".implode(", ",$sd):"").($wf?"\nORDER BY ".implode(", ",$wf):""),($y!=""?+$y:null),($E?$y*$E:0),"\n");$xh=microtime(true);$I=$this->_conn->query($G);if($hg)echo$b->selectQuery($G,$xh,!$I);return$I;}function
delete($Q,$qg,$y=0){$G="FROM ".table($Q);return
queries("DELETE".($y?limit1($Q,$G,$qg):" $G$qg"));}function
update($Q,$N,$qg,$y=0,$ah="\n"){$Oi=array();foreach($N
as$x=>$X)$Oi[]="$x = $X";$G=table($Q)." SET$ah".implode(",$ah",$Oi);return
queries("UPDATE".($y?limit1($Q,$G,$qg,$ah):" $G$qg"));}function
insert($Q,$N){return
queries("INSERT INTO ".table($Q).($N?" (".implode(", ",array_keys($N)).")\nVALUES (".implode(", ",$N).")":" DEFAULT VALUES"));}function
insertUpdate($Q,$K,$fg){return
false;}function
begin(){return
queries("BEGIN");}function
commit(){return
queries("COMMIT");}function
rollback(){return
queries("ROLLBACK");}function
slowQuery($G,$Xh){}function
convertSearch($t,$X,$m){return$t;}function
convertOperator($rf){return$rf;}function
value($X,$m){return(method_exists($this->_conn,'value')?$this->_conn->value($X,$m):(is_resource($X)?stream_get_contents($X):$X));}function
quoteBinary($Qg){return
q($Qg);}function
warnings(){return'';}function
tableHelp($B){}}$mc["sqlite"]="SQLite 3";$mc["sqlite2"]="SQLite 2";if(isset($_GET["sqlite"])||isset($_GET["sqlite2"])){define("DRIVER",(isset($_GET["sqlite"])?"sqlite":"sqlite2"));if(class_exists(isset($_GET["sqlite"])?"SQLite3":"SQLiteDatabase")){if(isset($_GET["sqlite"])){class
Min_SQLite{var$extension="SQLite3",$server_info,$affected_rows,$errno,$error,$_link;function
__construct($o){$this->_link=new
SQLite3($o);$Ri=$this->_link->version();$this->server_info=$Ri["versionString"];}function
query($G){$H=@$this->_link->query($G);$this->error="";if(!$H){$this->errno=$this->_link->lastErrorCode();$this->error=$this->_link->lastErrorMsg();return
false;}elseif($H->numColumns())return
new
Min_Result($H);$this->affected_rows=$this->_link->changes();return
true;}function
quote($P){return(is_utf8($P)?"'".$this->_link->escapeString($P)."'":"x'".reset(unpack('H*',$P))."'");}function
store_result(){return$this->_result;}function
result($G,$m=0){$H=$this->query($G);if(!is_object($H))return
false;$J=$H->_result->fetchArray();return$J?$J[$m]:false;}}class
Min_Result{var$_result,$_offset=0,$num_rows;function
__construct($H){$this->_result=$H;}function
fetch_assoc(){return$this->_result->fetchArray(SQLITE3_ASSOC);}function
fetch_row(){return$this->_result->fetchArray(SQLITE3_NUM);}function
fetch_field(){$d=$this->_offset++;$T=$this->_result->columnType($d);return(object)array("name"=>$this->_result->columnName($d),"type"=>$T,"charsetnr"=>($T==SQLITE3_BLOB?63:0),);}function
__desctruct(){return$this->_result->finalize();}}}else{class
Min_SQLite{var$extension="SQLite",$server_info,$affected_rows,$error,$_link;function
__construct($o){$this->server_info=sqlite_libversion();$this->_link=new
SQLiteDatabase($o);}function
query($G,$vi=false){$Oe=($vi?"unbufferedQuery":"query");$H=@$this->_link->$Oe($G,SQLITE_BOTH,$l);$this->error="";if(!$H){$this->error=$l;return
false;}elseif($H===true){$this->affected_rows=$this->changes();return
true;}return
new
Min_Result($H);}function
quote($P){return"'".sqlite_escape_string($P)."'";}function
store_result(){return$this->_result;}function
result($G,$m=0){$H=$this->query($G);if(!is_object($H))return
false;$J=$H->_result->fetch();return$J[$m];}}class
Min_Result{var$_result,$_offset=0,$num_rows;function
__construct($H){$this->_result=$H;if(method_exists($H,'numRows'))$this->num_rows=$H->numRows();}function
fetch_assoc(){$J=$this->_result->fetch(SQLITE_ASSOC);if(!$J)return
false;$I=array();foreach($J
as$x=>$X)$I[idf_unescape($x)]=$X;return$I;}function
fetch_row(){return$this->_result->fetch(SQLITE_NUM);}function
fetch_field(){$B=$this->_result->fieldName($this->_offset++);$Uf='(\[.*]|"(?:[^"]|"")*"|(.+))';if(preg_match("~^($Uf\\.)?$Uf\$~",$B,$A)){$Q=($A[3]!=""?$A[3]:idf_unescape($A[2]));$B=($A[5]!=""?$A[5]:idf_unescape($A[4]));}return(object)array("name"=>$B,"orgname"=>$B,"orgtable"=>$Q,);}}}}elseif(extension_loaded("pdo_sqlite")){class
Min_SQLite
extends
Min_PDO{var$extension="PDO_SQLite";function
__construct($o){$this->dsn(DRIVER.":$o","","");}}}if(class_exists("Min_SQLite")){class
Min_DB
extends
Min_SQLite{function
__construct(){parent::__construct(":memory:");$this->query("PRAGMA foreign_keys = 1");}function
select_db($o){if(is_readable($o)&&$this->query("ATTACH ".$this->quote(preg_match("~(^[/\\\\]|:)~",$o)?$o:dirname($_SERVER["SCRIPT_FILENAME"])."/$o")." AS a")){parent::__construct($o);$this->query("PRAGMA foreign_keys = 1");$this->query("PRAGMA busy_timeout = 500");return
true;}return
false;}function
multi_query($G){return$this->_result=$this->query($G);}function
next_result(){return
false;}}}class
Min_Driver
extends
Min_SQL{function
insertUpdate($Q,$K,$fg){$Oi=array();foreach($K
as$N)$Oi[]="(".implode(", ",$N).")";return
queries("REPLACE INTO ".table($Q)." (".implode(", ",array_keys(reset($K))).") VALUES\n".implode(",\n",$Oi));}function
tableHelp($B){if($B=="sqlite_sequence")return"fileformat2.html#seqtab";if($B=="sqlite_master")return"fileformat2.html#$B";}}function
idf_escape($t){return'"'.str_replace('"','""',$t).'"';}function
table($t){return
idf_escape($t);}function
connect(){global$b;list(,,$F)=$b->credentials();if($F!="")return'Database does not support password.';return
new
Min_DB;}function
get_databases(){return
array();}function
limit($G,$Z,$y,$C=0,$ah=" "){return" $G$Z".($y!==null?$ah."LIMIT $y".($C?" OFFSET $C":""):"");}function
limit1($Q,$G,$Z,$ah="\n"){global$f;return(preg_match('~^INTO~',$G)||$f->result("SELECT sqlite_compileoption_used('ENABLE_UPDATE_DELETE_LIMIT')")?limit($G,$Z,1,0,$ah):" $G WHERE rowid = (SELECT rowid FROM ".table($Q).$Z.$ah."LIMIT 1)");}function
db_collation($j,$ob){global$f;return$f->result("PRAGMA encoding");}function
engines(){return
array();}function
logged_user(){return
get_current_user();}function
tables_list(){return
get_key_vals("SELECT name, type FROM sqlite_master WHERE type IN ('table', 'view') ORDER BY (name = 'sqlite_sequence'), name");}function
count_tables($i){return
array();}function
table_status($B=""){global$f;$I=array();foreach(get_rows("SELECT name AS Name, type AS Engine, 'rowid' AS Oid, '' AS Auto_increment FROM sqlite_master WHERE type IN ('table', 'view') ".($B!=""?"AND name = ".q($B):"ORDER BY name"))as$J){$J["Rows"]=$f->result("SELECT COUNT(*) FROM ".idf_escape($J["Name"]));$I[$J["Name"]]=$J;}foreach(get_rows("SELECT * FROM sqlite_sequence",null,"")as$J)$I[$J["name"]]["Auto_increment"]=$J["seq"];return($B!=""?$I[$B]:$I);}function
is_view($R){return$R["Engine"]=="view";}function
fk_support($R){global$f;return!$f->result("SELECT sqlite_compileoption_used('OMIT_FOREIGN_KEY')");}function
fields($Q){global$f;$I=array();$fg="";foreach(get_rows("PRAGMA table_info(".table($Q).")")as$J){$B=$J["name"];$T=strtolower($J["type"]);$Zb=$J["dflt_value"];$I[$B]=array("field"=>$B,"type"=>(preg_match('~int~i',$T)?"integer":(preg_match('~char|clob|text~i',$T)?"text":(preg_match('~blob~i',$T)?"blob":(preg_match('~real|floa|doub~i',$T)?"real":"numeric")))),"full_type"=>$T,"default"=>(preg_match("~^'(.*)'$~",$Zb,$A)?str_replace("''","'",$A[1]):($Zb=="NULL"?null:$Zb)),"null"=>!$J["notnull"],"privileges"=>array("select"=>1,"insert"=>1,"update"=>1),"primary"=>$J["pk"],);if($J["pk"]){if($fg!="")$I[$fg]["auto_increment"]=false;elseif(preg_match('~^integer$~i',$T))$I[$B]["auto_increment"]=true;$fg=$B;}}$sh=$f->result("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ".q($Q));preg_match_all('~(("[^"]*+")+|[a-z0-9_]+)\s+text\s+COLLATE\s+(\'[^\']+\'|\S+)~i',$sh,$Ae,PREG_SET_ORDER);foreach($Ae
as$A){$B=str_replace('""','"',preg_replace('~^"|"$~','',$A[1]));if($I[$B])$I[$B]["collation"]=trim($A[3],"'");}return$I;}function
indexes($Q,$g=null){global$f;if(!is_object($g))$g=$f;$I=array();$sh=$g->result("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ".q($Q));if(preg_match('~\bPRIMARY\s+KEY\s*\((([^)"]+|"[^"]*"|`[^`]*`)++)~i',$sh,$A)){$I[""]=array("type"=>"PRIMARY","columns"=>array(),"lengths"=>array(),"descs"=>array());preg_match_all('~((("[^"]*+")+|(?:`[^`]*+`)+)|(\S+))(\s+(ASC|DESC))?(,\s*|$)~i',$A[1],$Ae,PREG_SET_ORDER);foreach($Ae
as$A){$I[""]["columns"][]=idf_unescape($A[2]).$A[4];$I[""]["descs"][]=(preg_match('~DESC~i',$A[5])?'1':null);}}if(!$I){foreach(fields($Q)as$B=>$m){if($m["primary"])$I[""]=array("type"=>"PRIMARY","columns"=>array($B),"lengths"=>array(),"descs"=>array(null));}}$vh=get_key_vals("SELECT name, sql FROM sqlite_master WHERE type = 'index' AND tbl_name = ".q($Q),$g);foreach(get_rows("PRAGMA index_list(".table($Q).")",$g)as$J){$B=$J["name"];$u=array("type"=>($J["unique"]?"UNIQUE":"INDEX"));$u["lengths"]=array();$u["descs"]=array();foreach(get_rows("PRAGMA index_info(".idf_escape($B).")",$g)as$Pg){$u["columns"][]=$Pg["name"];$u["descs"][]=null;}if(preg_match('~^CREATE( UNIQUE)? INDEX '.preg_quote(idf_escape($B).' ON '.idf_escape($Q),'~').' \((.*)\)$~i',$vh[$B],$_g)){preg_match_all('/("[^"]*+")+( DESC)?/',$_g[2],$Ae);foreach($Ae[2]as$x=>$X){if($X)$u["descs"][$x]='1';}}if(!$I[""]||$u["type"]!="UNIQUE"||$u["columns"]!=$I[""]["columns"]||$u["descs"]!=$I[""]["descs"]||!preg_match("~^sqlite_~",$B))$I[$B]=$u;}return$I;}function
foreign_keys($Q){$I=array();foreach(get_rows("PRAGMA foreign_key_list(".table($Q).")")as$J){$p=&$I[$J["id"]];if(!$p)$p=$J;$p["source"][]=$J["from"];$p["target"][]=$J["to"];}return$I;}function
view($B){global$f;return
array("select"=>preg_replace('~^(?:[^`"[]+|`[^`]*`|"[^"]*")* AS\s+~iU','',$f->result("SELECT sql FROM sqlite_master WHERE name = ".q($B))));}function
collations(){return(isset($_GET["create"])?get_vals("PRAGMA collation_list",1):array());}function
information_schema($j){return
false;}function
error(){global$f;return
h($f->error);}function
check_sqlite_name($B){global$f;$Sc="db|sdb|sqlite";if(!preg_match("~^[^\\0]*\\.($Sc)\$~",$B)){$f->error=sprintf('Please use one of the extensions %s.',str_replace("|",", ",$Sc));return
false;}return
true;}function
create_database($j,$nb){global$f;if(file_exists($j)){$f->error='File exists.';return
false;}if(!check_sqlite_name($j))return
false;try{$z=new
Min_SQLite($j);}catch(Exception$Jc){$f->error=$Jc->getMessage();return
false;}$z->query('PRAGMA encoding = "UTF-8"');$z->query('CREATE TABLE adminer (i)');$z->query('DROP TABLE adminer');return
true;}function
drop_databases($i){global$f;$f->__construct(":memory:");foreach($i
as$j){if(!@unlink($j)){$f->error='File exists.';return
false;}}return
true;}function
rename_database($B,$nb){global$f;if(!check_sqlite_name($B))return
false;$f->__construct(":memory:");$f->error='File exists.';return@rename(DB,$B);}function
auto_increment(){return" PRIMARY KEY".(DRIVER=="sqlite"?" AUTOINCREMENT":"");}function
alter_table($Q,$B,$n,$hd,$ub,$Bc,$nb,$Ka,$Qf){global$f;$Gi=($Q==""||$hd);foreach($n
as$m){if($m[0]!=""||!$m[1]||$m[2]){$Gi=true;break;}}$c=array();$Ef=array();foreach($n
as$m){if($m[1]){$c[]=($Gi?$m[1]:"ADD ".implode($m[1]));if($m[0]!="")$Ef[$m[0]]=$m[1][0];}}if(!$Gi){foreach($c
as$X){if(!queries("ALTER TABLE ".table($Q)." $X"))return
false;}if($Q!=$B&&!queries("ALTER TABLE ".table($Q)." RENAME TO ".table($B)))return
false;}elseif(!recreate_table($Q,$B,$c,$Ef,$hd,$Ka))return
false;if($Ka){queries("BEGIN");queries("UPDATE sqlite_sequence SET seq = $Ka WHERE name = ".q($B));if(!$f->affected_rows)queries("INSERT INTO sqlite_sequence (name, seq) VALUES (".q($B).", $Ka)");queries("COMMIT");}return
true;}function
recreate_table($Q,$B,$n,$Ef,$hd,$Ka=0,$v=array()){global$f;if($Q!=""){if(!$n){foreach(fields($Q)as$x=>$m){if($v)$m["auto_increment"]=0;$n[]=process_field($m,$m);$Ef[$x]=idf_escape($x);}}$gg=false;foreach($n
as$m){if($m[6])$gg=true;}$pc=array();foreach($v
as$x=>$X){if($X[2]=="DROP"){$pc[$X[1]]=true;unset($v[$x]);}}foreach(indexes($Q)as$fe=>$u){$e=array();foreach($u["columns"]as$x=>$d){if(!$Ef[$d])continue
2;$e[]=$Ef[$d].($u["descs"][$x]?" DESC":"");}if(!$pc[$fe]){if($u["type"]!="PRIMARY"||!$gg)$v[]=array($u["type"],$fe,$e);}}foreach($v
as$x=>$X){if($X[0]=="PRIMARY"){unset($v[$x]);$hd[]="  PRIMARY KEY (".implode(", ",$X[2]).")";}}foreach(foreign_keys($Q)as$fe=>$p){foreach($p["source"]as$x=>$d){if(!$Ef[$d])continue
2;$p["source"][$x]=idf_unescape($Ef[$d]);}if(!isset($hd[" $fe"]))$hd[]=" ".format_foreign_key($p);}queries("BEGIN");}foreach($n
as$x=>$m)$n[$x]="  ".implode($m);$n=array_merge($n,array_filter($hd));$Rh=($Q==$B?"adminer_$B":$B);if(!queries("CREATE TABLE ".table($Rh)." (\n".implode(",\n",$n)."\n)"))return
false;if($Q!=""){if($Ef&&!queries("INSERT INTO ".table($Rh)." (".implode(", ",$Ef).") SELECT ".implode(", ",array_map('idf_escape',array_keys($Ef)))." FROM ".table($Q)))return
false;$si=array();foreach(triggers($Q)as$qi=>$Yh){$pi=trigger($qi);$si[]="CREATE TRIGGER ".idf_escape($qi)." ".implode(" ",$Yh)." ON ".table($B)."\n$pi[Statement]";}$Ka=$Ka?0:$f->result("SELECT seq FROM sqlite_sequence WHERE name = ".q($Q));if(!queries("DROP TABLE ".table($Q))||($Q==$B&&!queries("ALTER TABLE ".table($Rh)." RENAME TO ".table($B)))||!alter_indexes($B,$v))return
false;if($Ka)queries("UPDATE sqlite_sequence SET seq = $Ka WHERE name = ".q($B));foreach($si
as$pi){if(!queries($pi))return
false;}queries("COMMIT");}return
true;}function
index_sql($Q,$T,$B,$e){return"CREATE $T ".($T!="INDEX"?"INDEX ":"").idf_escape($B!=""?$B:uniqid($Q."_"))." ON ".table($Q)." $e";}function
alter_indexes($Q,$c){foreach($c
as$fg){if($fg[0]=="PRIMARY")return
recreate_table($Q,$Q,array(),array(),array(),0,$c);}foreach(array_reverse($c)as$X){if(!queries($X[2]=="DROP"?"DROP INDEX ".idf_escape($X[1]):index_sql($Q,$X[0],$X[1],"(".implode(", ",$X[2]).")")))return
false;}return
true;}function
truncate_tables($S){return
apply_queries("DELETE FROM",$S);}function
drop_views($Ti){return
apply_queries("DROP VIEW",$Ti);}function
drop_tables($S){return
apply_queries("DROP TABLE",$S);}function
move_tables($S,$Ti,$Ph){return
false;}function
trigger($B){global$f;if($B=="")return
array("Statement"=>"BEGIN\n\t;\nEND");$t='(?:[^`"\s]+|`[^`]*`|"[^"]*")+';$ri=trigger_options();preg_match("~^CREATE\\s+TRIGGER\\s*$t\\s*(".implode("|",$ri["Timing"]).")\\s+([a-z]+)(?:\\s+OF\\s+($t))?\\s+ON\\s*$t\\s*(?:FOR\\s+EACH\\s+ROW\\s)?(.*)~is",$f->result("SELECT sql FROM sqlite_master WHERE type = 'trigger' AND name = ".q($B)),$A);$ff=$A[3];return
array("Timing"=>strtoupper($A[1]),"Event"=>strtoupper($A[2]).($ff?" OF":""),"Of"=>idf_unescape($ff),"Trigger"=>$B,"Statement"=>$A[4],);}function
triggers($Q){$I=array();$ri=trigger_options();foreach(get_rows("SELECT * FROM sqlite_master WHERE type = 'trigger' AND tbl_name = ".q($Q))as$J){preg_match('~^CREATE\s+TRIGGER\s*(?:[^`"\s]+|`[^`]*`|"[^"]*")+\s*('.implode("|",$ri["Timing"]).')\s*(.*?)\s+ON\b~i',$J["sql"],$A);$I[$J["name"]]=array($A[1],$A[2]);}return$I;}function
trigger_options(){return
array("Timing"=>array("BEFORE","AFTER","INSTEAD OF"),"Event"=>array("INSERT","UPDATE","UPDATE OF","DELETE"),"Type"=>array("FOR EACH ROW"),);}function
begin(){return
queries("BEGIN");}function
last_id(){global$f;return$f->result("SELECT LAST_INSERT_ROWID()");}function
explain($f,$G){return$f->query("EXPLAIN QUERY PLAN $G");}function
found_rows($R,$Z){}function
types(){return
array();}function
schemas(){return
array();}function
get_schema(){return"";}function
set_schema($Tg){return
true;}function
create_sql($Q,$Ka,$Ah){global$f;$I=$f->result("SELECT sql FROM sqlite_master WHERE type IN ('table', 'view') AND name = ".q($Q));foreach(indexes($Q)as$B=>$u){if($B=='')continue;$I.=";\n\n".index_sql($Q,$u['type'],$B,"(".implode(", ",array_map('idf_escape',$u['columns'])).")");}return$I;}function
truncate_sql($Q){return"DELETE FROM ".table($Q);}function
use_sql($Tb){}function
trigger_sql($Q){return
implode(get_vals("SELECT sql || ';;\n' FROM sqlite_master WHERE type = 'trigger' AND tbl_name = ".q($Q)));}function
show_variables(){global$f;$I=array();foreach(array("auto_vacuum","cache_size","count_changes","default_cache_size","empty_result_callbacks","encoding","foreign_keys","full_column_names","fullfsync","journal_mode","journal_size_limit","legacy_file_format","locking_mode","page_size","max_page_count","read_uncommitted","recursive_triggers","reverse_unordered_selects","secure_delete","short_column_names","synchronous","temp_store","temp_store_directory","schema_version","integrity_check","quick_check")as$x)$I[$x]=$f->result("PRAGMA $x");return$I;}function
is_c_style_escapes(){return
true;}function
show_status(){$I=array();foreach(get_vals("PRAGMA compile_options")as$uf){list($x,$X)=explode("=",$uf,2);$I[$x]=$X;}return$I;}function
convert_field($m){}function
unconvert_field($m,$I){return$I;}function
support($Wc){return
preg_match('~^(columns|database|drop_col|dump|indexes|descidx|move_col|sql|status|table|trigger|variables|view|view_trigger)$~',$Wc);}function
driver_config(){$U=array("integer"=>0,"real"=>0,"numeric"=>0,"text"=>0,"blob"=>0);return
array('possible_drivers'=>array((isset($_GET["sqlite"])?"SQLite3":"SQLite"),"PDO_SQLite"),'jush'=>"sqlite",'types'=>$U,'structured_types'=>array_keys($U),'unsigned'=>array(),'operators'=>array("=","<",">","<=",">=","!=","LIKE","LIKE %%","IN","IS NULL","NOT LIKE","NOT IN","IS NOT NULL","SQL"),'functions'=>array("hex","length","lower","round","unixepoch","upper"),'grouping'=>array("avg","count","count distinct","group_concat","max","min","sum"),'edit_functions'=>array(array(),array("integer|real|numeric"=>"+/-","text"=>"||",)),);}}$mc["pgsql"]="PostgreSQL";if(isset($_GET["pgsql"])){define("DRIVER","pgsql");if(extension_loaded("pgsql")){class
Min_DB{var$extension="PgSQL",$_link,$_result,$_string,$_database=true,$server_info,$affected_rows,$error,$timeout;function
_error($Ec,$l){if(ini_bool("html_errors"))$l=html_entity_decode(strip_tags($l));$l=preg_replace('~^[^:]*: ~','',$l);$this->error=$l;}function
connect($M,$V,$F){global$b;$j=$b->database();set_error_handler(array($this,'_error'));$this->_string="host='".str_replace(":","' port='",addcslashes($M,"'\\"))."' user='".addcslashes($V,"'\\")."' password='".addcslashes($F,"'\\")."'";$wh=$b->connectSsl();if(isset($wh["mode"]))$this->_string.=" sslmode='".$wh["mode"]."'";$this->_link=@pg_connect("$this->_string dbname='".($j!=""?addcslashes($j,"'\\"):"postgres")."'",PGSQL_CONNECT_FORCE_NEW);if(!$this->_link&&$j!=""){$this->_database=false;$this->_link=@pg_connect("$this->_string dbname='postgres'",PGSQL_CONNECT_FORCE_NEW);}restore_error_handler();if($this->_link){$Ri=pg_version($this->_link);$this->server_info=$Ri["server"];pg_set_client_encoding($this->_link,"UTF8");}return(bool)$this->_link;}function
quote($P){return
pg_escape_literal($this->_link,$P);}function
value($X,$m){return($m["type"]=="bytea"&&$X!==null?pg_unescape_bytea($X):$X);}function
quoteBinary($P){return"'".pg_escape_bytea($this->_link,$P)."'";}function
select_db($Tb){global$b;if($Tb==$b->database())return$this->_database;$I=@pg_connect("$this->_string dbname='".addcslashes($Tb,"'\\")."'",PGSQL_CONNECT_FORCE_NEW);if($I)$this->_link=$I;return$I;}function
close(){$this->_link=@pg_connect("$this->_string dbname='postgres'");}function
query($G,$vi=false){$H=@pg_query($this->_link,$G);$this->error="";if(!$H){$this->error=pg_last_error($this->_link);$I=false;}elseif(!pg_num_fields($H)){$this->affected_rows=pg_affected_rows($H);$I=true;}else$I=new
Min_Result($H);if($this->timeout){$this->timeout=0;$this->query("RESET statement_timeout");}return$I;}function
multi_query($G){return$this->_result=$this->query($G);}function
store_result(){return$this->_result;}function
next_result(){return
false;}function
result($G,$m=0){$H=$this->query($G);if(!$H||!$H->num_rows)return
false;return
pg_fetch_result($H->_result,0,$m);}function
warnings(){return
h(pg_last_notice($this->_link));}}class
Min_Result{var$_result,$_offset=0,$num_rows;function
__construct($H){$this->_result=$H;$this->num_rows=pg_num_rows($H);}function
fetch_assoc(){return
pg_fetch_assoc($this->_result);}function
fetch_row(){return
pg_fetch_row($this->_result);}function
fetch_field(){$d=$this->_offset++;$I=new
stdClass;if(function_exists('pg_field_table'))$I->orgtable=pg_field_table($this->_result,$d);$I->name=pg_field_name($this->_result,$d);$I->orgname=$I->name;$I->type=pg_field_type($this->_result,$d);$I->charsetnr=($I->type=="bytea"?63:0);return$I;}function
__destruct(){pg_free_result($this->_result);}}}elseif(extension_loaded("pdo_pgsql")){class
Min_DB
extends
Min_PDO{var$extension="PDO_PgSQL",$timeout;function
connect($M,$V,$F){global$b;$j=$b->database();$rc="pgsql:host='".str_replace(":","' port='",addcslashes($M,"'\\"))."' client_encoding=utf8 dbname='".($j!=""?addcslashes($j,"'\\"):"postgres")."'";$wh=$b->connectSsl();if(isset($wh["mode"]))$rc.=" sslmode='".$wh["mode"]."'";$this->dsn($rc,$V,$F);return
true;}function
select_db($Tb){global$b;return($b->database()==$Tb);}function
quoteBinary($Qg){return
q($Qg);}function
query($G,$vi=false){$I=parent::query($G,$vi);if($this->timeout){$this->timeout=0;parent::query("RESET statement_timeout");}return$I;}function
warnings(){return'';}function
close(){}}}class
Min_Driver
extends
Min_SQL{function
insertUpdate($Q,$K,$fg){global$f;foreach($K
as$N){$Ci=array();$Z=array();foreach($N
as$x=>$X){$Ci[]="$x = $X";if(isset($fg[idf_unescape($x)]))$Z[]="$x = $X";}if(!(($Z&&queries("UPDATE ".table($Q)." SET ".implode(", ",$Ci)." WHERE ".implode(" AND ",$Z))&&$f->affected_rows)||queries("INSERT INTO ".table($Q)." (".implode(", ",array_keys($N)).") VALUES (".implode(", ",$N).")")))return
false;}return
true;}function
slowQuery($G,$Xh){$this->_conn->query("SET statement_timeout = ".(1000*$Xh));$this->_conn->timeout=1000*$Xh;return$G;}function
convertSearch($t,$X,$m){$Uh="char|text";if(strpos($X["op"],"LIKE")===false)$Uh.="|date|time(stamp)?|boolean|uuid|inet|cidr|macaddr|".number_type();return(preg_match("~$Uh~",$m["type"])?$t:"CAST($t AS text)");}function
quoteBinary($Qg){return$this->_conn->quoteBinary($Qg);}function
warnings(){return$this->_conn->warnings();}function
tableHelp($B){$ve=array("information_schema"=>"infoschema","pg_catalog"=>"catalog",);$z=$ve[$_GET["ns"]];if($z)return"$z-".str_replace("_","-",$B).".html";}}function
idf_escape($t){return'"'.str_replace('"','""',$t).'"';}function
table($t){return
idf_escape($t);}function
connect(){global$b,$U,$_h;$f=new
Min_DB;$Mb=$b->credentials();if($f->connect($Mb[0],$Mb[1],$Mb[2])){if(min_version(9,0,$f)){$f->query("SET application_name = 'Adminer'");if(min_version(9.2,0,$f)){$_h['Strings'][]="json";$U["json"]=4294967295;if(min_version(9.4,0,$f)){$_h['Strings'][]="jsonb";$U["jsonb"]=4294967295;}}}return$f;}return$f->error;}function
get_databases(){return
get_vals("SELECT d.datname FROM pg_database d JOIN pg_roles r ON d.datdba = r.oid
WHERE d.datallowconn = TRUE AND has_database_privilege(d.datname, 'CONNECT') AND pg_has_role(r.rolname, 'USAGE')
ORDER BY d.datname");}function
limit($G,$Z,$y,$C=0,$ah=" "){return" $G$Z".($y!==null?$ah."LIMIT $y".($C?" OFFSET $C":""):"");}function
limit1($Q,$G,$Z,$ah="\n"){return(preg_match('~^INTO~',$G)?limit($G,$Z,1,0,$ah):" $G".(is_view(table_status1($Q))?$Z:$ah."WHERE ctid = (SELECT ctid FROM ".table($Q).$Z.$ah."LIMIT 1)"));}function
db_collation($j,$ob){global$f;return$f->result("SELECT datcollate FROM pg_database WHERE datname = ".q($j));}function
engines(){return
array();}function
logged_user(){global$f;return$f->result("SELECT user");}function
tables_list(){$G="SELECT table_name, table_type FROM information_schema.tables WHERE table_schema = current_schema()";if(support('materializedview'))$G.="
UNION ALL
SELECT matviewname, 'MATERIALIZED VIEW'
FROM pg_matviews
WHERE schemaname = current_schema()";$G.="
ORDER BY 1";return
get_key_vals($G);}function
count_tables($i){return
array();}function
table_status($B=""){$I=array();foreach(get_rows("SELECT c.relname AS \"Name\", CASE c.relkind WHEN 'r' THEN 'table' WHEN 'm' THEN 'materialized view' ELSE 'view' END AS \"Engine\", pg_table_size(c.oid) AS \"Data_length\", pg_indexes_size(c.oid) AS \"Index_length\", obj_description(c.oid, 'pg_class') AS \"Comment\", ".(min_version(12)?"''":"CASE WHEN c.relhasoids THEN 'oid' ELSE '' END")." AS \"Oid\", c.reltuples as \"Rows\", n.nspname
FROM pg_class c
JOIN pg_namespace n ON(n.nspname = current_schema() AND n.oid = c.relnamespace)
WHERE relkind IN ('r', 'm', 'v', 'f', 'p')
".($B!=""?"AND relname = ".q($B):"ORDER BY relname"))as$J)$I[$J["Name"]]=$J;return($B!=""?$I[$B]:$I);}function
is_view($R){return
in_array($R["Engine"],array("view","materialized view"));}function
fk_support($R){return
true;}function
fields($Q){$I=array();$Ba=array('timestamp without time zone'=>'timestamp','timestamp with time zone'=>'timestamptz',);foreach(get_rows("SELECT a.attname AS field, format_type(a.atttypid, a.atttypmod) AS full_type, pg_get_expr(d.adbin, d.adrelid) AS default, a.attnotnull::int, col_description(c.oid, a.attnum) AS comment".(min_version(10)?", a.attidentity":"")."
FROM pg_class c
JOIN pg_namespace n ON c.relnamespace = n.oid
JOIN pg_attribute a ON c.oid = a.attrelid
LEFT JOIN pg_attrdef d ON c.oid = d.adrelid AND a.attnum = d.adnum
WHERE c.relname = ".q($Q)."
AND n.nspname = current_schema()
AND NOT a.attisdropped
AND a.attnum > 0
ORDER BY a.attnum")as$J){preg_match('~([^([]+)(\((.*)\))?([a-z ]+)?((\[[0-9]*])*)$~',$J["full_type"],$A);list(,$T,$se,$J["length"],$wa,$Ea)=$A;$J["length"].=$Ea;$db=$T.$wa;if(isset($Ba[$db])){$J["type"]=$Ba[$db];$J["full_type"]=$J["type"].$se.$Ea;}else{$J["type"]=$T;$J["full_type"]=$J["type"].$se.$wa.$Ea;}if(in_array($J['attidentity'],array('a','d')))$J['default']='GENERATED '.($J['attidentity']=='d'?'BY DEFAULT':'ALWAYS').' AS IDENTITY';$J["null"]=!$J["attnotnull"];$J["auto_increment"]=$J['attidentity']||preg_match('~^nextval\(~i',$J["default"]);$J["privileges"]=array("insert"=>1,"select"=>1,"update"=>1);if(preg_match('~(.+)::[^,)]+(.*)~',$J["default"],$A))$J["default"]=($A[1]=="NULL"?null:idf_unescape($A[1]).$A[2]);$I[$J["field"]]=$J;}return$I;}function
indexes($Q,$g=null){global$f;if(!is_object($g))$g=$f;$I=array();$Ih=$g->result("SELECT oid FROM pg_class WHERE relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = current_schema()) AND relname = ".q($Q));$e=get_key_vals("SELECT attnum, attname FROM pg_attribute WHERE attrelid = $Ih AND attnum > 0",$g);foreach(get_rows("SELECT relname, indisunique::int, indisprimary::int, indkey, indoption, (indpred IS NOT NULL)::int as indispartial FROM pg_index i, pg_class ci WHERE i.indrelid = $Ih AND ci.oid = i.indexrelid",$g)as$J){$Ag=$J["relname"];$I[$Ag]["type"]=($J["indispartial"]?"INDEX":($J["indisprimary"]?"PRIMARY":($J["indisunique"]?"UNIQUE":"INDEX")));$I[$Ag]["columns"]=array();foreach(explode(" ",$J["indkey"])as$Od)$I[$Ag]["columns"][]=$e[$Od];$I[$Ag]["descs"]=array();foreach(explode(" ",$J["indoption"])as$Pd)$I[$Ag]["descs"][]=($Pd&1?'1':null);$I[$Ag]["lengths"]=array();}return$I;}function
foreign_keys($Q){global$nf;$I=array();foreach(get_rows("SELECT conname, condeferrable::int AS deferrable, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = (SELECT pc.oid FROM pg_class AS pc INNER JOIN pg_namespace AS pn ON (pn.oid = pc.relnamespace) WHERE pc.relname = ".q($Q)." AND pn.nspname = current_schema())
AND contype = 'f'::char
ORDER BY conkey, conname")as$J){if(preg_match('~FOREIGN KEY\s*\((.+)\)\s*REFERENCES (.+)\((.+)\)(.*)$~iA',$J['definition'],$A)){$J['source']=array_map('idf_unescape',array_map('trim',explode(',',$A[1])));if(preg_match('~^(("([^"]|"")+"|[^"]+)\.)?"?("([^"]|"")+"|[^"]+)$~',$A[2],$_e)){$J['ns']=idf_unescape($_e[2]);$J['table']=idf_unescape($_e[4]);}$J['target']=array_map('idf_unescape',array_map('trim',explode(',',$A[3])));$J['on_delete']=(preg_match("~ON DELETE ($nf)~",$A[4],$_e)?$_e[1]:'NO ACTION');$J['on_update']=(preg_match("~ON UPDATE ($nf)~",$A[4],$_e)?$_e[1]:'NO ACTION');$I[$J['conname']]=$J;}}return$I;}function
constraints($Q){global$nf;$I=array();foreach(get_rows("SELECT conname, consrc
FROM pg_catalog.pg_constraint
INNER JOIN pg_catalog.pg_namespace ON pg_constraint.connamespace = pg_namespace.oid
INNER JOIN pg_catalog.pg_class ON pg_constraint.conrelid = pg_class.oid AND pg_constraint.connamespace = pg_class.relnamespace
WHERE pg_constraint.contype = 'c'
AND conrelid != 0 -- handle only CONSTRAINTs here, not TYPES
AND nspname = current_schema()
AND relname = ".q($Q)."
ORDER BY connamespace, conname")as$J)$I[$J['conname']]=$J['consrc'];return$I;}function
view($B){global$f;return
array("select"=>trim($f->result("SELECT pg_get_viewdef(".$f->result("SELECT oid FROM pg_class WHERE relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = current_schema()) AND relname = ".q($B)).")")));}function
collations(){return
array();}function
information_schema($j){return($j=="information_schema");}function
error(){global$f;$I=h($f->error);if(preg_match('~^(.*\n)?([^\n]*)\n( *)\^(\n.*)?$~s',$I,$A))$I=$A[1].preg_replace('~((?:[^&]|&[^;]*;){'.strlen($A[3]).'})(.*)~','\1<b>\2</b>',$A[2]).$A[4];return
nl_br($I);}function
create_database($j,$nb){return
queries("CREATE DATABASE ".idf_escape($j).($nb?" ENCODING ".idf_escape($nb):""));}function
drop_databases($i){global$f;$f->close();return
apply_queries("DROP DATABASE",$i,'idf_escape');}function
rename_database($B,$nb){global$f;$f->close();return
queries("ALTER DATABASE ".idf_escape(DB)." RENAME TO ".idf_escape($B));}function
auto_increment(){return"";}function
alter_table($Q,$B,$n,$hd,$ub,$Bc,$nb,$Ka,$Qf){$c=array();$pg=array();if($Q!=""&&$Q!=$B)$pg[]="ALTER TABLE ".table($Q)." RENAME TO ".table($B);$bh="";foreach($n
as$m){$d=idf_escape($m[0]);$X=$m[1];if(!$X)$c[]="DROP $d";else{$Mi=$X[5];unset($X[5]);if($m[0]==""){if(isset($X[6]))$X[1]=($X[1]==" bigint"?" big":($X[1]==" smallint"?" small":" "))."serial";$c[]=($Q!=""?"ADD ":"  ").implode($X);if(isset($X[6]))$c[]=($Q!=""?"ADD":" ")." PRIMARY KEY ($X[0])";}else{if($d!=$X[0])$pg[]="ALTER TABLE ".table($B)." RENAME $d TO $X[0]";$c[]="ALTER $d TYPE$X[1]";$ch=$Q."_".idf_unescape($X[0])."_seq";$c[]="ALTER $d ".($X[3]?"SET$X[3]":(isset($X[6])?"SET DEFAULT nextval(".q($ch).")":"DROP DEFAULT"));if(isset($X[6]))$bh="CREATE SEQUENCE IF NOT EXISTS ".idf_escape($ch)." OWNED BY ".idf_escape($Q).".$X[0]";$c[]="ALTER $d ".($X[2]==" NULL"?"DROP NOT":"SET").$X[2];}if($m[0]!=""||$Mi!="")$pg[]="COMMENT ON COLUMN ".table($B).".$X[0] IS ".($Mi!=""?substr($Mi,9):"''");}}$c=array_merge($c,$hd);if($Q=="")array_unshift($pg,"CREATE TABLE ".table($B)." (\n".implode(",\n",$c)."\n)");elseif($c)array_unshift($pg,"ALTER TABLE ".table($Q)."\n".implode(",\n",$c));if($bh)array_unshift($pg,$bh);if($ub!==null)$pg[]="COMMENT ON TABLE ".table($B)." IS ".q($ub);if($Ka!=""){}foreach($pg
as$G){if(!queries($G))return
false;}return
true;}function
alter_indexes($Q,$c){$h=array();$nc=array();$pg=array();foreach($c
as$X){if($X[0]!="INDEX")$h[]=($X[2]=="DROP"?"\nDROP CONSTRAINT ".idf_escape($X[1]):"\nADD".($X[1]!=""?" CONSTRAINT ".idf_escape($X[1]):"")." $X[0] ".($X[0]=="PRIMARY"?"KEY ":"")."(".implode(", ",$X[2]).")");elseif($X[2]=="DROP")$nc[]=idf_escape($X[1]);else$pg[]="CREATE INDEX ".idf_escape($X[1]!=""?$X[1]:uniqid($Q."_"))." ON ".table($Q)." (".implode(", ",$X[2]).")";}if($h)array_unshift($pg,"ALTER TABLE ".table($Q).implode(",",$h));if($nc)array_unshift($pg,"DROP INDEX ".implode(", ",$nc));foreach($pg
as$G){if(!queries($G))return
false;}return
true;}function
truncate_tables($S){return
queries("TRUNCATE ".implode(", ",array_map('table',$S)));return
true;}function
drop_views($Ti){return
drop_tables($Ti);}function
drop_tables($S){foreach($S
as$Q){$O=table_status($Q);if(!queries("DROP ".strtoupper($O["Engine"])." ".table($Q)))return
false;}return
true;}function
move_tables($S,$Ti,$Ph){foreach(array_merge($S,$Ti)as$Q){$O=table_status($Q);if(!queries("ALTER ".strtoupper($O["Engine"])." ".table($Q)." SET SCHEMA ".idf_escape($Ph)))return
false;}return
true;}function
trigger($B,$Q){if($B=="")return
array("Statement"=>"EXECUTE PROCEDURE ()");$e=array();$Z="WHERE trigger_schema = current_schema() AND event_object_table = ".q($Q)." AND trigger_name = ".q($B);foreach(get_rows("SELECT * FROM information_schema.triggered_update_columns $Z")as$J)$e[]=$J["event_object_column"];$I=array();foreach(get_rows('SELECT trigger_name AS "Trigger", action_timing AS "Timing", event_manipulation AS "Event", \'FOR EACH \' || action_orientation AS "Type", action_statement AS "Statement" FROM information_schema.triggers '."$Z ORDER BY event_manipulation DESC")as$J){if($e&&$J["Event"]=="UPDATE")$J["Event"].=" OF";$J["Of"]=implode(", ",$e);if($I)$J["Event"].=" OR $I[Event]";$I=$J;}return$I;}function
triggers($Q){$I=array();foreach(get_rows("SELECT * FROM information_schema.triggers WHERE trigger_schema = current_schema() AND event_object_table = ".q($Q))as$J){$pi=trigger($J["trigger_name"],$Q);$I[$pi["Trigger"]]=array($pi["Timing"],$pi["Event"]);}return$I;}function
trigger_options(){return
array("Timing"=>array("BEFORE","AFTER"),"Event"=>array("INSERT","UPDATE","UPDATE OF","DELETE","INSERT OR UPDATE","INSERT OR UPDATE OF","DELETE OR INSERT","DELETE OR UPDATE","DELETE OR UPDATE OF","DELETE OR INSERT OR UPDATE","DELETE OR INSERT OR UPDATE OF"),"Type"=>array("FOR EACH ROW","FOR EACH STATEMENT"),);}function
routine($B,$T){$K=get_rows('SELECT routine_definition AS definition, LOWER(external_language) AS language, *
FROM information_schema.routines
WHERE routine_schema = current_schema() AND specific_name = '.q($B));$I=$K[0];$I["returns"]=array("type"=>$I["type_udt_name"]);$I["fields"]=get_rows('SELECT parameter_name AS field, data_type AS type, character_maximum_length AS length, parameter_mode AS inout
FROM information_schema.parameters
WHERE specific_schema = current_schema() AND specific_name = '.q($B).'
ORDER BY ordinal_position');return$I;}function
routines(){return
get_rows('SELECT specific_name AS "SPECIFIC_NAME", routine_type AS "ROUTINE_TYPE", routine_name AS "ROUTINE_NAME", type_udt_name AS "DTD_IDENTIFIER"
FROM information_schema.routines
WHERE routine_schema = current_schema()
ORDER BY SPECIFIC_NAME');}function
routine_languages(){return
get_vals("SELECT LOWER(lanname) FROM pg_catalog.pg_language");}function
routine_id($B,$J){$I=array();foreach($J["fields"]as$m)$I[]=$m["type"];return
idf_escape($B)."(".implode(", ",$I).")";}function
last_id(){return
0;}function
explain($f,$G){return$f->query("EXPLAIN $G");}function
found_rows($R,$Z){global$f;if(preg_match("~ rows=([0-9]+)~",$f->result("EXPLAIN SELECT * FROM ".idf_escape($R["Name"]).($Z?" WHERE ".implode(" AND ",$Z):"")),$_g))return$_g[1];return
false;}function
types(){return
get_vals("SELECT typname
FROM pg_type
WHERE typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = current_schema())
AND typtype IN ('b','d','e')
AND typelem = 0");}function
schemas(){return
get_vals("SELECT nspname FROM pg_namespace ORDER BY nspname");}function
get_schema(){global$f;return$f->result("SELECT current_schema()");}function
set_schema($Sg,$g=null){global$f,$U,$_h;if(!$g)$g=$f;$I=$g->query("SET search_path TO ".idf_escape($Sg));foreach(types()as$T){if(!isset($U[$T])){$U[$T]=0;$_h['User types'][]=$T;}}return$I;}function
foreign_keys_sql($Q){$I="";$O=table_status($Q);$ed=foreign_keys($Q);ksort($ed);foreach($ed
as$dd=>$cd)$I.="ALTER TABLE ONLY ".idf_escape($O['nspname']).".".idf_escape($O['Name'])." ADD CONSTRAINT ".idf_escape($dd)." $cd[definition] ".($cd['deferrable']?'DEFERRABLE':'NOT DEFERRABLE').";\n";return($I?"$I\n":$I);}function
create_sql($Q,$Ka,$Ah){$Ig=array();$dh=array();$O=table_status($Q);if(is_view($O)){$Si=view($Q);return
rtrim("CREATE VIEW ".idf_escape($Q)." AS $Si[select]",";");}$n=fields($Q);$v=indexes($Q);ksort($v);$Cb=constraints($Q);if(!$O||empty($n))return
false;$I="CREATE TABLE ".idf_escape($O['nspname']).".".idf_escape($O['Name'])." (\n    ";foreach($n
as$m){$Nf=idf_escape($m['field']).' '.$m['full_type'].default_value($m).($m['attnotnull']?" NOT NULL":"");$Ig[]=$Nf;if(preg_match('~nextval\(\'([^\']+)\'\)~',$m['default'],$Ae)){$ch=$Ae[1];$rh=reset(get_rows(min_version(10)?"SELECT *, cache_size AS cache_value FROM pg_sequences WHERE schemaname = current_schema() AND sequencename = ".q(idf_unescape($ch)):"SELECT * FROM $ch"));$dh[]=($Ah=="DROP+CREATE"?"DROP SEQUENCE IF EXISTS $ch;\n":"")."CREATE SEQUENCE $ch INCREMENT $rh[increment_by] MINVALUE $rh[min_value] MAXVALUE $rh[max_value]".($Ka&&$rh['last_value']?" START ".($rh["last_value"]+1):"")." CACHE $rh[cache_value];";}}if(!empty($dh))$I=implode("\n\n",$dh)."\n\n$I";foreach($v
as$Md=>$u){switch($u['type']){case'UNIQUE':$Ig[]="CONSTRAINT ".idf_escape($Md)." UNIQUE (".implode(', ',array_map('idf_escape',$u['columns'])).")";break;case'PRIMARY':$Ig[]="CONSTRAINT ".idf_escape($Md)." PRIMARY KEY (".implode(', ',array_map('idf_escape',$u['columns'])).")";break;}}foreach($Cb
as$_b=>$Bb)$Ig[]="CONSTRAINT ".idf_escape($_b)." CHECK $Bb";$I.=implode(",\n    ",$Ig)."\n) WITH (oids = ".($O['Oid']?'true':'false').");";foreach($v
as$Md=>$u){if($u['type']=='INDEX'){$e=array();foreach($u['columns']as$x=>$X)$e[]=idf_escape($X).($u['descs'][$x]?" DESC":"");$I.="\n\nCREATE INDEX ".idf_escape($Md)." ON ".idf_escape($O['nspname']).".".idf_escape($O['Name'])." USING btree (".implode(', ',$e).");";}}if($O['Comment'])$I.="\n\nCOMMENT ON TABLE ".idf_escape($O['nspname']).".".idf_escape($O['Name'])." IS ".q($O['Comment']).";";foreach($n
as$Yc=>$m){if($m['comment'])$I.="\n\nCOMMENT ON COLUMN ".idf_escape($O['nspname']).".".idf_escape($O['Name']).".".idf_escape($Yc)." IS ".q($m['comment']).";";}return
rtrim($I,';');}function
truncate_sql($Q){return"TRUNCATE ".table($Q);}function
trigger_sql($Q){$O=table_status($Q);$I="";foreach(triggers($Q)as$oi=>$ni){$pi=trigger($oi,$O['Name']);$I.="\nCREATE TRIGGER ".idf_escape($pi['Trigger'])." $pi[Timing] $pi[Event] ON ".idf_escape($O["nspname"]).".".idf_escape($O['Name'])." $pi[Type] $pi[Statement];;\n";}return$I;}function
use_sql($Tb){return"\connect ".idf_escape($Tb);}function
show_variables(){return
get_key_vals("SHOW ALL");}function
is_c_style_escapes(){static$Xa=null;if($Xa===null){$Ni=get_vals("SHOW standard_conforming_strings");$Xa=$Ni[0]=="off";}return$Xa;}function
process_list(){return
get_rows("SELECT * FROM pg_stat_activity ORDER BY ".(min_version(9.2)?"pid":"procpid"));}function
show_status(){}function
convert_field($m){}function
unconvert_field($m,$I){return$I;}function
support($Wc){return
preg_match('~^(database|table|columns|sql|indexes|descidx|comment|view|'.(min_version(9.3)?'materializedview|':'').'scheme|routine|processlist|sequence|trigger|type|variables|drop_col|kill|dump)$~',$Wc);}function
kill_process($X){return
queries("SELECT pg_terminate_backend(".number($X).")");}function
connection_id(){return"SELECT pg_backend_pid()";}function
max_connections(){global$f;return$f->result("SHOW max_connections");}function
driver_config(){$U=array();$_h=array();foreach(array('Numbers'=>array("smallint"=>5,"integer"=>10,"bigint"=>19,"boolean"=>1,"numeric"=>0,"real"=>7,"double precision"=>16,"money"=>20),'Date and time'=>array("date"=>13,"time"=>17,"timestamp"=>20,"timestamptz"=>21,"interval"=>0),'Strings'=>array("character"=>0,"character varying"=>0,"text"=>0,"tsquery"=>0,"tsvector"=>0,"uuid"=>0,"xml"=>0),'Binary'=>array("bit"=>0,"bit varying"=>0,"bytea"=>0),'Network'=>array("cidr"=>43,"inet"=>43,"macaddr"=>17,"macaddr8"=>23,"txid_snapshot"=>0),'Geometry'=>array("box"=>0,"circle"=>0,"line"=>0,"lseg"=>0,"path"=>0,"point"=>0,"polygon"=>0),)as$x=>$X){$U+=$X;$_h[$x]=array_keys($X);}return
array('possible_drivers'=>array("PgSQL","PDO_PgSQL"),'jush'=>"pgsql",'types'=>$U,'structured_types'=>$_h,'unsigned'=>array(),'operators'=>array("=","<",">","<=",">=","!=","~","!~","LIKE","LIKE %%","ILIKE","ILIKE %%","IN","IS NULL","NOT LIKE","NOT IN","IS NOT NULL"),'functions'=>array("char_length","lower","round","to_hex","to_timestamp","upper"),'grouping'=>array("avg","count","count distinct","max","min","sum"),'edit_functions'=>array(array("char"=>"md5","date|time"=>"now",),array(number_type()=>"+/-","date|time"=>"+ interval/- interval","char|text"=>"||",)),);}}$mc["oracle"]="Oracle (beta)";if(isset($_GET["oracle"])){define("DRIVER","oracle");if(extension_loaded("oci8")){class
Min_DB{var$extension="oci8",$_link,$_result,$server_info,$affected_rows,$errno,$error;var$_current_db;function
_error($Ec,$l){if(ini_bool("html_errors"))$l=html_entity_decode(strip_tags($l));$l=preg_replace('~^[^:]*: ~','',$l);$this->error=$l;}function
connect($M,$V,$F){$this->_link=@oci_new_connect($V,$F,$M,"AL32UTF8");if($this->_link){$this->server_info=oci_server_version($this->_link);return
true;}$l=oci_error();$this->error=$l["message"];return
false;}function
quote($P){return"'".str_replace("'","''",$P)."'";}function
select_db($Tb){$this->_current_db=$Tb;return
true;}function
query($G,$vi=false){$H=oci_parse($this->_link,$G);$this->error="";if(!$H){$l=oci_error($this->_link);$this->errno=$l["code"];$this->error=$l["message"];return
false;}set_error_handler(array($this,'_error'));$I=@oci_execute($H);restore_error_handler();if($I){if(oci_num_fields($H))return
new
Min_Result($H);$this->affected_rows=oci_num_rows($H);oci_free_statement($H);}return$I;}function
multi_query($G){return$this->_result=$this->query($G);}function
store_result(){return$this->_result;}function
next_result(){return
false;}function
result($G,$m=1){$H=$this->query($G);if(!is_object($H)||!oci_fetch($H->_result))return
false;return
oci_result($H->_result,$m);}}class
Min_Result{var$_result,$_offset=1,$num_rows;function
__construct($H){$this->_result=$H;}function
_convert($J){foreach((array)$J
as$x=>$X){if(is_a($X,'OCI-Lob'))$J[$x]=$X->load();}return$J;}function
fetch_assoc(){return$this->_convert(oci_fetch_assoc($this->_result));}function
fetch_row(){return$this->_convert(oci_fetch_row($this->_result));}function
fetch_field(){$d=$this->_offset++;$I=new
stdClass;$I->name=oci_field_name($this->_result,$d);$I->orgname=$I->name;$I->type=oci_field_type($this->_result,$d);$I->charsetnr=(preg_match("~raw|blob|bfile~",$I->type)?63:0);return$I;}function
__destruct(){oci_free_statement($this->_result);}}}elseif(extension_loaded("pdo_oci")){class
Min_DB
extends
Min_PDO{var$extension="PDO_OCI";var$_current_db;function
connect($M,$V,$F){$this->dsn("oci:dbname=//$M;charset=AL32UTF8",$V,$F);return
true;}function
select_db($Tb){$this->_current_db=$Tb;return
true;}}}class
Min_Driver
extends
Min_SQL{function
begin(){return
true;}function
insertUpdate($Q,$K,$fg){global$f;foreach($K
as$N){$Ci=array();$Z=array();foreach($N
as$x=>$X){$Ci[]="$x = $X";if(isset($fg[idf_unescape($x)]))$Z[]="$x = $X";}if(!(($Z&&queries("UPDATE ".table($Q)." SET ".implode(", ",$Ci)." WHERE ".implode(" AND ",$Z))&&$f->affected_rows)||queries("INSERT INTO ".table($Q)." (".implode(", ",array_keys($N)).") VALUES (".implode(", ",$N).")")))return
false;}return
true;}}function
idf_escape($t){return'"'.str_replace('"','""',$t).'"';}function
table($t){return
idf_escape($t);}function
connect(){global$b;$f=new
Min_DB;$Mb=$b->credentials();if($f->connect($Mb[0],$Mb[1],$Mb[2]))return$f;return$f->error;}function
get_databases(){return
get_vals("SELECT DISTINCT tablespace_name FROM (
SELECT tablespace_name FROM user_tablespaces
UNION SELECT tablespace_name FROM all_tables WHERE tablespace_name IS NOT NULL
)
ORDER BY 1");}function
limit($G,$Z,$y,$C=0,$ah=" "){return($C?" * FROM (SELECT t.*, rownum AS rnum FROM (SELECT $G$Z) t WHERE rownum <= ".($y+$C).") WHERE rnum > $C":($y!==null?" * FROM (SELECT $G$Z) WHERE rownum <= ".($y+$C):" $G$Z"));}function
limit1($Q,$G,$Z,$ah="\n"){return" $G$Z";}function
db_collation($j,$ob){global$f;return$f->result("SELECT value FROM nls_database_parameters WHERE parameter = 'NLS_CHARACTERSET'");}function
engines(){return
array();}function
logged_user(){global$f;return$f->result("SELECT USER FROM DUAL");}function
get_current_db(){global$f;$j=$f->_current_db?$f->_current_db:DB;unset($f->_current_db);return$j;}function
where_owner($dg,$Hf="owner"){if(!$_GET["ns"])return'';return"$dg$Hf = sys_context('USERENV', 'CURRENT_SCHEMA')";}function
views_table($e){$Hf=where_owner('');return"(SELECT $e FROM all_views WHERE ".($Hf?$Hf:"rownum < 0").")";}function
tables_list(){$Si=views_table("view_name");$Hf=where_owner(" AND ");return
get_key_vals("SELECT table_name, 'table' FROM all_tables WHERE tablespace_name = ".q(DB)."$Hf
UNION SELECT view_name, 'view' FROM $Si
ORDER BY 1");}function
count_tables($i){global$f;$I=array();foreach($i
as$j)$I[$j]=$f->result("SELECT COUNT(*) FROM all_tables WHERE tablespace_name = ".q($j));return$I;}function
table_status($B=""){$I=array();$Ug=q($B);$j=get_current_db();$Si=views_table("view_name");$Hf=where_owner(" AND ");foreach(get_rows('SELECT table_name "Name", \'table\' "Engine", avg_row_len * num_rows "Data_length", num_rows "Rows" FROM all_tables WHERE tablespace_name = '.q($j).$Hf.($B!=""?" AND table_name = $Ug":"")."
UNION SELECT view_name, 'view', 0, 0 FROM $Si".($B!=""?" WHERE view_name = $Ug":"")."
ORDER BY 1")as$J){if($B!="")return$J;$I[$J["Name"]]=$J;}return$I;}function
is_view($R){return$R["Engine"]=="view";}function
fk_support($R){return
true;}function
fields($Q){$I=array();$Hf=where_owner(" AND ");foreach(get_rows("SELECT * FROM all_tab_columns WHERE table_name = ".q($Q)."$Hf ORDER BY column_id")as$J){$T=$J["DATA_TYPE"];$se="$J[DATA_PRECISION],$J[DATA_SCALE]";if($se==",")$se=$J["CHAR_COL_DECL_LENGTH"];$I[$J["COLUMN_NAME"]]=array("field"=>$J["COLUMN_NAME"],"full_type"=>$T.($se?"($se)":""),"type"=>strtolower($T),"length"=>$se,"default"=>$J["DATA_DEFAULT"],"null"=>($J["NULLABLE"]=="Y"),"privileges"=>array("insert"=>1,"select"=>1,"update"=>1),);}return$I;}function
indexes($Q,$g=null){$I=array();$Hf=where_owner(" AND ","aic.table_owner");foreach(get_rows("SELECT aic.*, ac.constraint_type, atc.data_default
FROM all_ind_columns aic
LEFT JOIN all_constraints ac ON aic.index_name = ac.constraint_name AND aic.table_name = ac.table_name AND aic.index_owner = ac.owner
LEFT JOIN all_tab_cols atc ON aic.column_name = atc.column_name AND aic.table_name = atc.table_name AND aic.index_owner = atc.owner
WHERE aic.table_name = ".q($Q)."$Hf
ORDER BY ac.constraint_type, aic.column_position",$g)as$J){$Md=$J["INDEX_NAME"];$rb=$J["DATA_DEFAULT"];$rb=($rb?trim($rb,'"'):$J["COLUMN_NAME"]);$I[$Md]["type"]=($J["CONSTRAINT_TYPE"]=="P"?"PRIMARY":($J["CONSTRAINT_TYPE"]=="U"?"UNIQUE":"INDEX"));$I[$Md]["columns"][]=$rb;$I[$Md]["lengths"][]=($J["CHAR_LENGTH"]&&$J["CHAR_LENGTH"]!=$J["COLUMN_LENGTH"]?$J["CHAR_LENGTH"]:null);$I[$Md]["descs"][]=($J["DESCEND"]&&$J["DESCEND"]=="DESC"?'1':null);}return$I;}function
view($B){$Si=views_table("view_name, text");$K=get_rows('SELECT text "select" FROM '.$Si.' WHERE view_name = '.q($B));return
reset($K);}function
collations(){return
array();}function
information_schema($j){return
false;}function
error(){global$f;return
h($f->error);}function
explain($f,$G){$f->query("EXPLAIN PLAN FOR $G");return$f->query("SELECT * FROM plan_table");}function
found_rows($R,$Z){}function
auto_increment(){return"";}function
alter_table($Q,$B,$n,$hd,$ub,$Bc,$nb,$Ka,$Qf){$c=$nc=array();$Bf=($Q?fields($Q):array());foreach($n
as$m){$X=$m[1];if($X&&$m[0]!=""&&idf_escape($m[0])!=$X[0])queries("ALTER TABLE ".table($Q)." RENAME COLUMN ".idf_escape($m[0])." TO $X[0]");$Af=$Bf[$m[0]];if($X&&$Af){$hf=process_field($Af,$Af);if($X[2]==$hf[2])$X[2]="";}if($X)$c[]=($Q!=""?($m[0]!=""?"MODIFY (":"ADD ("):"  ").implode($X).($Q!=""?")":"");else$nc[]=idf_escape($m[0]);}if($Q=="")return
queries("CREATE TABLE ".table($B)." (\n".implode(",\n",$c)."\n)");return(!$c||queries("ALTER TABLE ".table($Q)."\n".implode("\n",$c)))&&(!$nc||queries("ALTER TABLE ".table($Q)." DROP (".implode(", ",$nc).")"))&&($Q==$B||queries("ALTER TABLE ".table($Q)." RENAME TO ".table($B)));}function
alter_indexes($Q,$c){$nc=array();$pg=array();foreach($c
as$X){if($X[0]!="INDEX"){$X[2]=preg_replace('~ DESC$~','',$X[2]);$h=($X[2]=="DROP"?"\nDROP CONSTRAINT ".idf_escape($X[1]):"\nADD".($X[1]!=""?" CONSTRAINT ".idf_escape($X[1]):"")." $X[0] ".($X[0]=="PRIMARY"?"KEY ":"")."(".implode(", ",$X[2]).")");array_unshift($pg,"ALTER TABLE ".table($Q).$h);}elseif($X[2]=="DROP")$nc[]=idf_escape($X[1]);else$pg[]="CREATE INDEX ".idf_escape($X[1]!=""?$X[1]:uniqid($Q."_"))." ON ".table($Q)." (".implode(", ",$X[2]).")";}if($nc)array_unshift($pg,"DROP INDEX ".implode(", ",$nc));foreach($pg
as$G){if(!queries($G))return
false;}return
true;}function
foreign_keys($Q){$I=array();$G="SELECT c_list.CONSTRAINT_NAME as NAME,
c_src.COLUMN_NAME as SRC_COLUMN,
c_dest.OWNER as DEST_DB,
c_dest.TABLE_NAME as DEST_TABLE,
c_dest.COLUMN_NAME as DEST_COLUMN,
c_list.DELETE_RULE as ON_DELETE
FROM ALL_CONSTRAINTS c_list, ALL_CONS_COLUMNS c_src, ALL_CONS_COLUMNS c_dest
WHERE c_list.CONSTRAINT_NAME = c_src.CONSTRAINT_NAME
AND c_list.R_CONSTRAINT_NAME = c_dest.CONSTRAINT_NAME
AND c_list.CONSTRAINT_TYPE = 'R'
AND c_src.TABLE_NAME = ".q($Q);foreach(get_rows($G)as$J)$I[$J['NAME']]=array("db"=>$J['DEST_DB'],"table"=>$J['DEST_TABLE'],"source"=>array($J['SRC_COLUMN']),"target"=>array($J['DEST_COLUMN']),"on_delete"=>$J['ON_DELETE'],"on_update"=>null,);return$I;}function
truncate_tables($S){return
apply_queries("TRUNCATE TABLE",$S);}function
drop_views($Ti){return
apply_queries("DROP VIEW",$Ti);}function
drop_tables($S){return
apply_queries("DROP TABLE",$S);}function
last_id(){return
0;}function
schemas(){$I=get_vals("SELECT DISTINCT owner FROM dba_segments WHERE owner IN (SELECT username FROM dba_users WHERE default_tablespace NOT IN ('SYSTEM','SYSAUX')) ORDER BY 1");return($I?$I:get_vals("SELECT DISTINCT owner FROM all_tables WHERE tablespace_name = ".q(DB)." ORDER BY 1"));}function
get_schema(){global$f;return$f->result("SELECT sys_context('USERENV', 'SESSION_USER') FROM dual");}function
set_schema($Tg,$g=null){global$f;if(!$g)$g=$f;return$g->query("ALTER SESSION SET CURRENT_SCHEMA = ".idf_escape($Tg));}function
show_variables(){return
get_key_vals('SELECT name, display_value FROM v$parameter');}function
is_c_style_escapes(){return
true;}function
process_list(){return
get_rows('SELECT sess.process AS "process", sess.username AS "user", sess.schemaname AS "schema", sess.status AS "status", sess.wait_class AS "wait_class", sess.seconds_in_wait AS "seconds_in_wait", sql.sql_text AS "sql_text", sess.machine AS "machine", sess.port AS "port"
FROM v$session sess LEFT OUTER JOIN v$sql sql
ON sql.sql_id = sess.sql_id
WHERE sess.type = \'USER\'
ORDER BY PROCESS
');}function
show_status(){$K=get_rows('SELECT * FROM v$instance');return
reset($K);}function
convert_field($m){}function
unconvert_field($m,$I){return$I;}function
support($Wc){return
preg_match('~^(columns|database|drop_col|indexes|descidx|processlist|scheme|sql|status|table|variables|view)$~',$Wc);}function
driver_config(){$U=array();$_h=array();foreach(array('Numbers'=>array("number"=>38,"binary_float"=>12,"binary_double"=>21),'Date and time'=>array("date"=>10,"timestamp"=>29,"interval year"=>12,"interval day"=>28),'Strings'=>array("char"=>2000,"varchar2"=>4000,"nchar"=>2000,"nvarchar2"=>4000,"clob"=>4294967295,"nclob"=>4294967295),'Binary'=>array("raw"=>2000,"long raw"=>2147483648,"blob"=>4294967295,"bfile"=>4294967296),)as$x=>$X){$U+=$X;$_h[$x]=array_keys($X);}return
array('possible_drivers'=>array("OCI8","PDO_OCI"),'jush'=>"oracle",'types'=>$U,'structured_types'=>$_h,'unsigned'=>array(),'operators'=>array("=","<",">","<=",">=","!=","LIKE","LIKE %%","IN","IS NULL","NOT LIKE","NOT IN","IS NOT NULL","SQL"),'functions'=>array("length","lower","round","upper"),'grouping'=>array("avg","count","count distinct","max","min","sum"),'edit_functions'=>array(array("date"=>"current_date","timestamp"=>"current_timestamp",),array("number|float|double"=>"+/-","date|timestamp"=>"+ interval/- interval","char|clob"=>"||",)),);}}$mc["mssql"]="MS SQL (beta)";if(isset($_GET["mssql"])){define("DRIVER","mssql");if(extension_loaded("sqlsrv")){class
Min_DB{var$extension="sqlsrv",$_link,$_result,$server_info,$affected_rows,$errno,$error;function
_get_error(){$this->error="";foreach(sqlsrv_errors()as$l){$this->errno=$l["code"];$this->error.="$l[message]\n";}$this->error=rtrim($this->error);}function
connect($M,$V,$F){global$b;$Ab=array("UID"=>$V,"PWD"=>$F,"CharacterSet"=>"UTF-8");$wh=$b->connectSsl();if(isset($wh["Encrypt"]))$Ab["Encrypt"]=$wh["Encrypt"];if(isset($wh["TrustServerCertificate"]))$Ab["TrustServerCertificate"]=$wh["TrustServerCertificate"];$j=$b->database();if($j!="")$Ab["Database"]=$j;$this->_link=@sqlsrv_connect(preg_replace('~:~',',',$M),$Ab);if($this->_link){$Qd=sqlsrv_server_info($this->_link);$this->server_info=$Qd['SQLServerVersion'];}else$this->_get_error();return(bool)$this->_link;}function
quote($P){$wi=strlen($P)!=strlen(utf8_decode($P));return($wi?"N":"")."'".str_replace("'","''",$P)."'";}function
select_db($Tb){return$this->query("USE ".idf_escape($Tb));}function
query($G,$vi=false){$H=sqlsrv_query($this->_link,$G);$this->error="";if(!$H){$this->_get_error();return
false;}return$this->store_result($H);}function
multi_query($G){$this->_result=sqlsrv_query($this->_link,$G);$this->error="";if(!$this->_result){$this->_get_error();return
false;}return
true;}function
store_result($H=null){if(!$H)$H=$this->_result;if(!$H)return
false;if(sqlsrv_field_metadata($H))return
new
Min_Result($H);$this->affected_rows=sqlsrv_rows_affected($H);return
true;}function
next_result(){return$this->_result?sqlsrv_next_result($this->_result):null;}function
result($G,$m=0){$H=$this->query($G);if(!is_object($H))return
false;$J=$H->fetch_row();return$J[$m];}}class
Min_Result{var$_result,$_offset=0,$_fields,$num_rows;function
__construct($H){$this->_result=$H;}function
_convert($J){foreach((array)$J
as$x=>$X){if(is_a($X,'DateTime'))$J[$x]=$X->format("Y-m-d H:i:s");}return$J;}function
fetch_assoc(){return$this->_convert(sqlsrv_fetch_array($this->_result,SQLSRV_FETCH_ASSOC));}function
fetch_row(){return$this->_convert(sqlsrv_fetch_array($this->_result,SQLSRV_FETCH_NUMERIC));}function
fetch_field(){if(!$this->_fields)$this->_fields=sqlsrv_field_metadata($this->_result);$m=$this->_fields[$this->_offset++];$I=new
stdClass;$I->name=$m["Name"];$I->orgname=$m["Name"];$I->type=($m["Type"]==1?254:0);return$I;}function
seek($C){for($s=0;$s<$C;$s++)sqlsrv_fetch($this->_result);}function
__destruct(){sqlsrv_free_stmt($this->_result);}}}elseif(extension_loaded("mssql")){class
Min_DB{var$extension="MSSQL",$_link,$_result,$server_info,$affected_rows,$error;function
connect($M,$V,$F){$this->_link=@mssql_connect($M,$V,$F);if($this->_link){$H=$this->query("SELECT SERVERPROPERTY('ProductLevel'), SERVERPROPERTY('Edition')");if($H){$J=$H->fetch_row();$this->server_info=$this->result("sp_server_info 2",2)." [$J[0]] $J[1]";}}else$this->error=mssql_get_last_message();return(bool)$this->_link;}function
quote($P){$wi=strlen($P)!=strlen(utf8_decode($P));return($wi?"N":"")."'".str_replace("'","''",$P)."'";}function
select_db($Tb){return
mssql_select_db($Tb);}function
query($G,$vi=false){$H=@mssql_query($G,$this->_link);$this->error="";if(!$H){$this->error=mssql_get_last_message();return
false;}if($H===true){$this->affected_rows=mssql_rows_affected($this->_link);return
true;}return
new
Min_Result($H);}function
multi_query($G){return$this->_result=$this->query($G);}function
store_result(){return$this->_result;}function
next_result(){return
mssql_next_result($this->_result->_result);}function
result($G,$m=0){$H=$this->query($G);if(!is_object($H))return
false;return
mssql_result($H->_result,0,$m);}}class
Min_Result{var$_result,$_offset=0,$_fields,$num_rows;function
__construct($H){$this->_result=$H;$this->num_rows=mssql_num_rows($H);}function
fetch_assoc(){return
mssql_fetch_assoc($this->_result);}function
fetch_row(){return
mssql_fetch_row($this->_result);}function
num_rows(){return
mssql_num_rows($this->_result);}function
fetch_field(){$I=mssql_fetch_field($this->_result);$I->orgtable=$I->table;$I->orgname=$I->name;return$I;}function
seek($C){mssql_data_seek($this->_result,$C);}function
__destruct(){mssql_free_result($this->_result);}}}elseif(extension_loaded("pdo_dblib")){class
Min_DB
extends
Min_PDO{var$extension="PDO_DBLIB";function
connect($M,$V,$F){$this->dsn("dblib:charset=utf8;host=".str_replace(":",";unix_socket=",preg_replace('~:(\d)~',';port=\1',$M)),$V,$F);return
true;}function
select_db($Tb){return$this->query("USE ".idf_escape($Tb));}}}class
Min_Driver
extends
Min_SQL{function
insertUpdate($Q,$K,$fg){foreach($K
as$N){$Ci=array();$Z=array();foreach($N
as$x=>$X){$Ci[]="$x = $X";if(isset($fg[idf_unescape($x)]))$Z[]="$x = $X";}if(!queries("MERGE ".table($Q)." USING (VALUES(".implode(", ",$N).")) AS source (c".implode(", c",range(1,count($N))).") ON ".implode(" AND ",$Z)." WHEN MATCHED THEN UPDATE SET ".implode(", ",$Ci)." WHEN NOT MATCHED THEN INSERT (".implode(", ",array_keys($N)).") VALUES (".implode(", ",$N).");"))return
false;}return
true;}function
begin(){return
queries("BEGIN TRANSACTION");}}function
idf_escape($t){return"[".str_replace("]","]]",$t)."]";}function
table($t){return($_GET["ns"]!=""?idf_escape($_GET["ns"]).".":"").idf_escape($t);}function
connect(){global$b;$f=new
Min_DB;$Mb=$b->credentials();if($Mb[0]=="")$Mb[0]="localhost:1433";if($f->connect($Mb[0],$Mb[1],$Mb[2]))return$f;return$f->error;}function
get_databases(){return
get_vals("SELECT name FROM sys.databases WHERE name NOT IN ('master', 'tempdb', 'model', 'msdb')");}function
limit($G,$Z,$y,$C=0,$ah=" "){return($y!==null?" TOP (".($y+$C).")":"")." $G$Z";}function
limit1($Q,$G,$Z,$ah="\n"){return
limit($G,$Z,1,0,$ah);}function
db_collation($j,$ob){global$f;return$f->result("SELECT collation_name FROM sys.databases WHERE name = ".q($j));}function
engines(){return
array();}function
logged_user(){global$f;return$f->result("SELECT SUSER_NAME()");}function
tables_list(){return
get_key_vals("SELECT name, type_desc FROM sys.all_objects WHERE schema_id = SCHEMA_ID(".q(get_schema()).") AND type IN ('S', 'U', 'V') ORDER BY name");}function
count_tables($i){global$f;$I=array();foreach($i
as$j){$f->select_db($j);$I[$j]=$f->result("SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES");}return$I;}function
table_status($B=""){$I=array();foreach(get_rows("SELECT ao.name AS Name, ao.type_desc AS Engine, (SELECT value FROM fn_listextendedproperty(default, 'SCHEMA', schema_name(schema_id), 'TABLE', ao.name, null, null)) AS Comment FROM sys.all_objects AS ao WHERE schema_id = SCHEMA_ID(".q(get_schema()).") AND type IN ('S', 'U', 'V') ".($B!=""?"AND name = ".q($B):"ORDER BY name"))as$J){if($B!="")return$J;$I[$J["Name"]]=$J;}return$I;}function
is_view($R){return$R["Engine"]=="VIEW";}function
fk_support($R){return
true;}function
fields($Q){$wb=get_key_vals("SELECT objname, cast(value as varchar(max)) FROM fn_listextendedproperty('MS_DESCRIPTION', 'schema', ".q(get_schema()).", 'table', ".q($Q).", 'column', NULL)");$I=array();foreach(get_rows("SELECT c.max_length, c.precision, c.scale, c.name, c.is_nullable, c.is_identity, c.collation_name, t.name type, CAST(d.definition as text) [default]
FROM sys.all_columns c
JOIN sys.all_objects o ON c.object_id = o.object_id
JOIN sys.types t ON c.user_type_id = t.user_type_id
LEFT JOIN sys.default_constraints d ON c.default_object_id = d.parent_column_id
WHERE o.schema_id = SCHEMA_ID(".q(get_schema()).") AND o.type IN ('S', 'U', 'V') AND o.name = ".q($Q))as$J){$T=$J["type"];$se=(preg_match("~char|binary~",$T)?$J["max_length"]:($T=="decimal"?"$J[precision],$J[scale]":""));$I[$J["name"]]=array("field"=>$J["name"],"full_type"=>$T.($se?"($se)":""),"type"=>$T,"length"=>$se,"default"=>$J["default"],"null"=>$J["is_nullable"],"auto_increment"=>$J["is_identity"],"collation"=>$J["collation_name"],"privileges"=>array("insert"=>1,"select"=>1,"update"=>1),"primary"=>$J["is_identity"],"comment"=>$wb[$J["name"]],);}return$I;}function
indexes($Q,$g=null){$I=array();foreach(get_rows("SELECT i.name, key_ordinal, is_unique, is_primary_key, c.name AS column_name, is_descending_key
FROM sys.indexes i
INNER JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
INNER JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
WHERE OBJECT_NAME(i.object_id) = ".q($Q),$g)as$J){$B=$J["name"];$I[$B]["type"]=($J["is_primary_key"]?"PRIMARY":($J["is_unique"]?"UNIQUE":"INDEX"));$I[$B]["lengths"]=array();$I[$B]["columns"][$J["key_ordinal"]]=$J["column_name"];$I[$B]["descs"][$J["key_ordinal"]]=($J["is_descending_key"]?'1':null);}return$I;}function
view($B){global$f;return
array("select"=>preg_replace('~^(?:[^[]|\[[^]]*])*\s+AS\s+~isU','',$f->result("SELECT VIEW_DEFINITION FROM INFORMATION_SCHEMA.VIEWS WHERE TABLE_SCHEMA = SCHEMA_NAME() AND TABLE_NAME = ".q($B))));}function
collations(){$I=array();foreach(get_vals("SELECT name FROM fn_helpcollations()")as$nb)$I[preg_replace('~_.*~','',$nb)][]=$nb;return$I;}function
information_schema($j){return
false;}function
error(){global$f;return
nl_br(h(preg_replace('~^(\[[^]]*])+~m','',$f->error)));}function
create_database($j,$nb){return
queries("CREATE DATABASE ".idf_escape($j).(preg_match('~^[a-z0-9_]+$~i',$nb)?" COLLATE $nb":""));}function
drop_databases($i){return
queries("DROP DATABASE ".implode(", ",array_map('idf_escape',$i)));}function
rename_database($B,$nb){if(preg_match('~^[a-z0-9_]+$~i',$nb))queries("ALTER DATABASE ".idf_escape(DB)." COLLATE $nb");queries("ALTER DATABASE ".idf_escape(DB)." MODIFY NAME = ".idf_escape($B));return
true;}function
auto_increment(){return" IDENTITY".($_POST["Auto_increment"]!=""?"(".number($_POST["Auto_increment"]).",1)":"")." PRIMARY KEY";}function
alter_table($Q,$B,$n,$hd,$ub,$Bc,$nb,$Ka,$Qf){$c=array();$wb=array();foreach($n
as$m){$d=idf_escape($m[0]);$X=$m[1];if(!$X)$c["DROP"][]=" COLUMN $d";else{$X[1]=preg_replace("~( COLLATE )'(\\w+)'~",'\1\2',$X[1]);$wb[$m[0]]=$X[5];unset($X[5]);if($m[0]=="")$c["ADD"][]="\n  ".implode("",$X).($Q==""?substr($hd[$X[0]],16+strlen($X[0])):"");else{unset($X[6]);if($d!=$X[0])queries("EXEC sp_rename ".q(table($Q).".$d").", ".q(idf_unescape($X[0])).", 'COLUMN'");$c["ALTER COLUMN ".implode("",$X)][]="";}}}if($Q=="")return
queries("CREATE TABLE ".table($B)." (".implode(",",(array)$c["ADD"])."\n)");if($Q!=$B)queries("EXEC sp_rename ".q(table($Q)).", ".q($B));if($hd)$c[""]=$hd;foreach($c
as$x=>$X){if(!queries("ALTER TABLE ".idf_escape($B)." $x".implode(",",$X)))return
false;}foreach($wb
as$x=>$X){$ub=substr($X,9);queries("EXEC sp_dropextendedproperty @name = N'MS_Description', @level0type = N'Schema', @level0name = ".q(get_schema()).", @level1type = N'Table', @level1name = ".q($B).", @level2type = N'Column', @level2name = ".q($x));queries("EXEC sp_addextendedproperty @name = N'MS_Description', @value = ".$ub.", @level0type = N'Schema', @level0name = ".q(get_schema()).", @level1type = N'Table', @level1name = ".q($B).", @level2type = N'Column', @level2name = ".q($x));}return
true;}function
alter_indexes($Q,$c){$u=array();$nc=array();foreach($c
as$X){if($X[2]=="DROP"){if($X[0]=="PRIMARY")$nc[]=idf_escape($X[1]);else$u[]=idf_escape($X[1])." ON ".table($Q);}elseif(!queries(($X[0]!="PRIMARY"?"CREATE $X[0] ".($X[0]!="INDEX"?"INDEX ":"").idf_escape($X[1]!=""?$X[1]:uniqid($Q."_"))." ON ".table($Q):"ALTER TABLE ".table($Q)." ADD PRIMARY KEY")." (".implode(", ",$X[2]).")"))return
false;}return(!$u||queries("DROP INDEX ".implode(", ",$u)))&&(!$nc||queries("ALTER TABLE ".table($Q)." DROP ".implode(", ",$nc)));}function
last_id(){global$f;return$f->result("SELECT SCOPE_IDENTITY()");}function
explain($f,$G){$f->query("SET SHOWPLAN_ALL ON");$I=$f->query($G);$f->query("SET SHOWPLAN_ALL OFF");return$I;}function
found_rows($R,$Z){}function
foreign_keys($Q){$I=array();foreach(get_rows("EXEC sp_fkeys @fktable_name = ".q($Q).", @fktable_owner = ".q(get_schema()))as$J){$p=&$I[$J["FK_NAME"]];$p["db"]=$J["PKTABLE_QUALIFIER"];$p["table"]=$J["PKTABLE_NAME"];$p["source"][]=$J["FKCOLUMN_NAME"];$p["target"][]=$J["PKCOLUMN_NAME"];}return$I;}function
truncate_tables($S){return
apply_queries("TRUNCATE TABLE",$S);}function
drop_views($Ti){return
queries("DROP VIEW ".implode(", ",array_map('table',$Ti)));}function
drop_tables($S){return
queries("DROP TABLE ".implode(", ",array_map('table',$S)));}function
move_tables($S,$Ti,$Ph){return
apply_queries("ALTER SCHEMA ".idf_escape($Ph)." TRANSFER",array_merge($S,$Ti));}function
trigger($B){if($B=="")return
array();$K=get_rows("SELECT s.name [Trigger],
CASE WHEN OBJECTPROPERTY(s.id, 'ExecIsInsertTrigger') = 1 THEN 'INSERT' WHEN OBJECTPROPERTY(s.id, 'ExecIsUpdateTrigger') = 1 THEN 'UPDATE' WHEN OBJECTPROPERTY(s.id, 'ExecIsDeleteTrigger') = 1 THEN 'DELETE' END [Event],
CASE WHEN OBJECTPROPERTY(s.id, 'ExecIsInsteadOfTrigger') = 1 THEN 'INSTEAD OF' ELSE 'AFTER' END [Timing],
c.text
FROM sysobjects s
JOIN syscomments c ON s.id = c.id
WHERE s.xtype = 'TR' AND s.name = ".q($B));$I=reset($K);if($I)$I["Statement"]=preg_replace('~^.+\s+AS\s+~isU','',$I["text"]);return$I;}function
triggers($Q){$I=array();foreach(get_rows("SELECT sys1.name,
CASE WHEN OBJECTPROPERTY(sys1.id, 'ExecIsInsertTrigger') = 1 THEN 'INSERT' WHEN OBJECTPROPERTY(sys1.id, 'ExecIsUpdateTrigger') = 1 THEN 'UPDATE' WHEN OBJECTPROPERTY(sys1.id, 'ExecIsDeleteTrigger') = 1 THEN 'DELETE' END [Event],
CASE WHEN OBJECTPROPERTY(sys1.id, 'ExecIsInsteadOfTrigger') = 1 THEN 'INSTEAD OF' ELSE 'AFTER' END [Timing]
FROM sysobjects sys1
JOIN sysobjects sys2 ON sys1.parent_obj = sys2.id
WHERE sys1.xtype = 'TR' AND sys2.name = ".q($Q))as$J)$I[$J["name"]]=array($J["Timing"],$J["Event"]);return$I;}function
trigger_options(){return
array("Timing"=>array("AFTER","INSTEAD OF"),"Event"=>array("INSERT","UPDATE","DELETE"),"Type"=>array("AS"),);}function
schemas(){return
get_vals("SELECT name FROM sys.schemas");}function
get_schema(){global$f;if($_GET["ns"]!="")return$_GET["ns"];return$f->result("SELECT SCHEMA_NAME()");}function
set_schema($Sg){return
true;}function
use_sql($Tb){return"USE ".idf_escape($Tb);}function
show_variables(){return
array();}function
is_c_style_escapes(){return
true;}function
show_status(){return
array();}function
convert_field($m){}function
unconvert_field($m,$I){return$I;}function
support($Wc){return
preg_match('~^(comment|columns|database|drop_col|indexes|descidx|scheme|sql|table|trigger|view|view_trigger)$~',$Wc);}function
driver_config(){$U=array();$_h=array();foreach(array('Numbers'=>array("tinyint"=>3,"smallint"=>5,"int"=>10,"bigint"=>20,"bit"=>1,"decimal"=>0,"real"=>12,"float"=>53,"smallmoney"=>10,"money"=>20),'Date and time'=>array("date"=>10,"smalldatetime"=>19,"datetime"=>19,"datetime2"=>19,"time"=>8,"datetimeoffset"=>10),'Strings'=>array("char"=>8000,"varchar"=>8000,"text"=>2147483647,"nchar"=>4000,"nvarchar"=>4000,"ntext"=>1073741823),'Binary'=>array("binary"=>8000,"varbinary"=>8000,"image"=>2147483647),)as$x=>$X){$U+=$X;$_h[$x]=array_keys($X);}return
array('possible_drivers'=>array("SQLSRV","MSSQL","PDO_DBLIB"),'jush'=>"mssql",'types'=>$U,'structured_types'=>$_h,'unsigned'=>array(),'operators'=>array("=","<",">","<=",">=","!=","LIKE","LIKE %%","IN","IS NULL","NOT LIKE","NOT IN","IS NOT NULL"),'functions'=>array("len","lower","round","upper"),'grouping'=>array("avg","count","count distinct","max","min","sum"),'edit_functions'=>array(array("date|time"=>"getdate",),array("int|decimal|real|float|money|datetime"=>"+/-","char|text"=>"+",)),);}}$mc["mongo"]="MongoDB (alpha)";if(isset($_GET["mongo"])){define("DRIVER","mongo");if(class_exists('MongoDB')){class
Min_DB{var$extension="Mongo",$server_info=MongoClient::VERSION,$error,$last_id,$_link,$_db;function
connect($Di,$D){try{$this->_link=new
MongoClient($Di,$D);if($D["password"]!=""){$D["password"]="";try{new
MongoClient($Di,$D);$this->error='Database does not support password.';}catch(Exception$tc){}}}catch(Exception$tc){$this->error=$tc->getMessage();}}function
query($G){return
false;}function
select_db($Tb){try{$this->_db=$this->_link->selectDB($Tb);return
true;}catch(Exception$Jc){$this->error=$Jc->getMessage();return
false;}}function
quote($P){return$P;}}class
Min_Result{var$num_rows,$_rows=array(),$_offset=0,$_charset=array();function
__construct($H){foreach($H
as$ce){$J=array();foreach($ce
as$x=>$X){if(is_a($X,'MongoBinData'))$this->_charset[$x]=63;$J[$x]=(is_a($X,'MongoId')?"ObjectId(\"$X\")":(is_a($X,'MongoDate')?gmdate("Y-m-d H:i:s",$X->sec)." GMT":(is_a($X,'MongoBinData')?$X->bin:(is_a($X,'MongoRegex')?"$X":(is_object($X)?get_class($X):$X)))));}$this->_rows[]=$J;foreach($J
as$x=>$X){if(!isset($this->_rows[0][$x]))$this->_rows[0][$x]=null;}}$this->num_rows=count($this->_rows);}function
fetch_assoc(){$J=current($this->_rows);if(!$J)return$J;$I=array();foreach($this->_rows[0]as$x=>$X)$I[$x]=$J[$x];next($this->_rows);return$I;}function
fetch_row(){$I=$this->fetch_assoc();if(!$I)return$I;return
array_values($I);}function
fetch_field(){$ge=array_keys($this->_rows[0]);$B=$ge[$this->_offset++];return(object)array('name'=>$B,'charsetnr'=>$this->_charset[$B],);}}class
Min_Driver
extends
Min_SQL{public$fg="_id";function
select($Q,$L,$Z,$sd,$wf=array(),$y=1,$E=0,$hg=false){$L=($L==array("*")?array():array_fill_keys($L,true));$oh=array();foreach($wf
as$X){$X=preg_replace('~ DESC$~','',$X,1,$Ib);$oh[$X]=($Ib?-1:1);}return
new
Min_Result($this->_conn->_db->selectCollection($Q)->find(array(),$L)->sort($oh)->limit($y!=""?+$y:0)->skip($E*$y));}function
insert($Q,$N){try{$I=$this->_conn->_db->selectCollection($Q)->insert($N);$this->_conn->errno=$I['code'];$this->_conn->error=$I['err'];$this->_conn->last_id=$N['_id'];return!$I['err'];}catch(Exception$Jc){$this->_conn->error=$Jc->getMessage();return
false;}}}function
get_databases($fd){global$f;$I=array();$Xb=$f->_link->listDBs();foreach($Xb['databases']as$j)$I[]=$j['name'];return$I;}function
count_tables($i){global$f;$I=array();foreach($i
as$j)$I[$j]=count($f->_link->selectDB($j)->getCollectionNames(true));return$I;}function
tables_list(){global$f;return
array_fill_keys($f->_db->getCollectionNames(true),'table');}function
drop_databases($i){global$f;foreach($i
as$j){$Eg=$f->_link->selectDB($j)->drop();if(!$Eg['ok'])return
false;}return
true;}function
indexes($Q,$g=null){global$f;$I=array();foreach($f->_db->selectCollection($Q)->getIndexInfo()as$u){$fc=array();foreach($u["key"]as$d=>$T)$fc[]=($T==-1?'1':null);$I[$u["name"]]=array("type"=>($u["name"]=="_id_"?"PRIMARY":($u["unique"]?"UNIQUE":"INDEX")),"columns"=>array_keys($u["key"]),"lengths"=>array(),"descs"=>$fc,);}return$I;}function
fields($Q){return
fields_from_edit();}function
found_rows($R,$Z){global$f;return$f->_db->selectCollection($_GET["select"])->count($Z);}$sf=array("=");}elseif(class_exists('MongoDB\Driver\Manager')){class
Min_DB{var$extension="MongoDB",$server_info=MONGODB_VERSION,$affected_rows,$error,$last_id;var$_link;var$_db,$_db_name;function
connect($Di,$D){$ib='MongoDB\Driver\Manager';$this->_link=new$ib($Di,$D);$this->executeCommand($D["db"],array('ping'=>1));}function
executeCommand($j,$sb){$ib='MongoDB\Driver\Command';try{return$this->_link->executeCommand($j,new$ib($sb));}catch(Exception$tc){$this->error=$tc->getMessage();return
array();}}function
executeBulkWrite($Ve,$Wa,$Jb){try{$Hg=$this->_link->executeBulkWrite($Ve,$Wa);$this->affected_rows=$Hg->$Jb();return
true;}catch(Exception$tc){$this->error=$tc->getMessage();return
false;}}function
query($G){return
false;}function
select_db($Tb){$this->_db_name=$Tb;return
true;}function
quote($P){return$P;}}class
Min_Result{var$num_rows,$_rows=array(),$_offset=0,$_charset=array();function
__construct($H){foreach($H
as$ce){$J=array();foreach($ce
as$x=>$X){if(is_a($X,'MongoDB\BSON\Binary'))$this->_charset[$x]=63;$J[$x]=(is_a($X,'MongoDB\BSON\ObjectID')?'MongoDB\BSON\ObjectID("'."$X\")":(is_a($X,'MongoDB\BSON\UTCDatetime')?$X->toDateTime()->format('Y-m-d H:i:s'):(is_a($X,'MongoDB\BSON\Binary')?$X->getData():(is_a($X,'MongoDB\BSON\Regex')?"$X":(is_object($X)||is_array($X)?json_encode($X,256):$X)))));}$this->_rows[]=$J;foreach($J
as$x=>$X){if(!isset($this->_rows[0][$x]))$this->_rows[0][$x]=null;}}$this->num_rows=count($this->_rows);}function
fetch_assoc(){$J=current($this->_rows);if(!$J)return$J;$I=array();foreach($this->_rows[0]as$x=>$X)$I[$x]=$J[$x];next($this->_rows);return$I;}function
fetch_row(){$I=$this->fetch_assoc();if(!$I)return$I;return
array_values($I);}function
fetch_field(){$ge=array_keys($this->_rows[0]);$B=$ge[$this->_offset++];return(object)array('name'=>$B,'charsetnr'=>$this->_charset[$B],);}}class
Min_Driver
extends
Min_SQL{public$fg="_id";function
select($Q,$L,$Z,$sd,$wf=array(),$y=1,$E=0,$hg=false){global$f;$L=($L==array("*")?array():array_fill_keys($L,1));if(count($L)&&!isset($L['_id']))$L['_id']=0;$Z=where_to_query($Z);$oh=array();foreach($wf
as$X){$X=preg_replace('~ DESC$~','',$X,1,$Ib);$oh[$X]=($Ib?-1:1);}if(isset($_GET['limit'])&&is_numeric($_GET['limit'])&&$_GET['limit']>0)$y=$_GET['limit'];$y=min(200,max(1,(int)$y));$lh=$E*$y;$ib='MongoDB\Driver\Query';try{return
new
Min_Result($f->_link->executeQuery("$f->_db_name.$Q",new$ib($Z,array('projection'=>$L,'limit'=>$y,'skip'=>$lh,'sort'=>$oh))));}catch(Exception$tc){$f->error=$tc->getMessage();return
false;}}function
update($Q,$N,$qg,$y=0,$ah="\n"){global$f;$j=$f->_db_name;$Z=sql_query_where_parser($qg);$ib='MongoDB\Driver\BulkWrite';$Wa=new$ib(array());if(isset($N['_id']))unset($N['_id']);$Bg=array();foreach($N
as$x=>$Y){if($Y=='NULL'){$Bg[$x]=1;unset($N[$x]);}}$Ci=array('$set'=>$N);if(count($Bg))$Ci['$unset']=$Bg;$Wa->update($Z,$Ci,array('upsert'=>false));return$f->executeBulkWrite("$j.$Q",$Wa,'getModifiedCount');}function
delete($Q,$qg,$y=0){global$f;$j=$f->_db_name;$Z=sql_query_where_parser($qg);$ib='MongoDB\Driver\BulkWrite';$Wa=new$ib(array());$Wa->delete($Z,array('limit'=>$y));return$f->executeBulkWrite("$j.$Q",$Wa,'getDeletedCount');}function
insert($Q,$N){global$f;$j=$f->_db_name;$ib='MongoDB\Driver\BulkWrite';$Wa=new$ib(array());if($N['_id']=='')unset($N['_id']);$Wa->insert($N);return$f->executeBulkWrite("$j.$Q",$Wa,'getInsertedCount');}}function
get_databases($fd){global$f;$I=array();foreach($f->executeCommand($f->_db_name,array('listDatabases'=>1))as$Xb){foreach($Xb->databases
as$j)$I[]=$j->name;}return$I;}function
count_tables($i){$I=array();return$I;}function
tables_list(){global$f;$pb=array();foreach($f->executeCommand($f->_db_name,array('listCollections'=>1))as$H)$pb[$H->name]='table';return$pb;}function
drop_databases($i){return
false;}function
indexes($Q,$g=null){global$f;$I=array();foreach($f->executeCommand($f->_db_name,array('listIndexes'=>$Q))as$u){$fc=array();$e=array();foreach(get_object_vars($u->key)as$d=>$T){$fc[]=($T==-1?'1':null);$e[]=$d;}$I[$u->name]=array("type"=>($u->name=="_id_"?"PRIMARY":(isset($u->unique)?"UNIQUE":"INDEX")),"columns"=>$e,"lengths"=>array(),"descs"=>$fc,);}return$I;}function
fields($Q){global$k;$n=fields_from_edit();if(!$n){$H=$k->select($Q,array("*"),null,null,array(),10);if($H){while($J=$H->fetch_assoc()){foreach($J
as$x=>$X){$J[$x]=null;$n[$x]=array("field"=>$x,"type"=>"string","null"=>($x!=$k->primary),"auto_increment"=>($x==$k->primary),"privileges"=>array("insert"=>1,"select"=>1,"update"=>1,),);}}}}return$n;}function
found_rows($R,$Z){global$f;$Z=where_to_query($Z);$fi=$f->executeCommand($f->_db_name,array('count'=>$R['Name'],'query'=>$Z))->toArray();return$fi[0]->n;}function
sql_query_where_parser($qg){$qg=preg_replace('~^\s*WHERE\s*~',"",$qg);while($qg[0]=="(")$qg=preg_replace('~^\((.*)\)$~',"$1",$qg);$dj=explode(' AND ',$qg);$ej=explode(') OR (',$qg);$Z=array();foreach($dj
as$bj)$Z[]=trim($bj);if(count($ej)==1)$ej=array();elseif(count($ej)>1)$Z=array();return
where_to_query($Z,$ej);}function
where_to_query($Zi=array(),$aj=array()){global$b;$Rb=array();foreach(array('and'=>$Zi,'or'=>$aj)as$T=>$Z){if(is_array($Z)){foreach($Z
as$Pc){list($lb,$qf,$X)=explode(" ",$Pc,3);if($lb=="_id"&&preg_match('~^(MongoDB\\\\BSON\\\\ObjectID)\("(.+)"\)$~',$X,$A)){list(,$ib,$X)=$A;$X=new$ib($X);}if(!in_array($qf,$b->operators))continue;if(preg_match('~^\(f\)(.+)~',$qf,$A)){$X=(float)$X;$qf=$A[1];}elseif(preg_match('~^\(date\)(.+)~',$qf,$A)){$Ub=new
DateTime($X);$ib='MongoDB\BSON\UTCDatetime';$X=new$ib($Ub->getTimestamp()*1000);$qf=$A[1];}switch($qf){case'=':$qf='$eq';break;case'!=':$qf='$ne';break;case'>':$qf='$gt';break;case'<':$qf='$lt';break;case'>=':$qf='$gte';break;case'<=':$qf='$lte';break;case'regex':$qf='$regex';break;default:continue
2;}if($T=='and')$Rb['$and'][]=array($lb=>array($qf=>$X));elseif($T=='or')$Rb['$or'][]=array($lb=>array($qf=>$X));}}}return$Rb;}$sf=array("=","!=",">","<",">=","<=","regex","(f)=","(f)!=","(f)>","(f)<","(f)>=","(f)<=","(date)=","(date)!=","(date)>","(date)<","(date)>=","(date)<=",);}function
table($t){return$t;}function
idf_escape($t){return$t;}function
table_status($B="",$Vc=false){$I=array();foreach(tables_list()as$Q=>$T){$I[$Q]=array("Name"=>$Q);if($B==$Q)return$I[$Q];}return$I;}function
create_database($j,$nb){return
true;}function
last_id(){global$f;return$f->last_id;}function
error(){global$f;return
h($f->error);}function
collations(){return
array();}function
logged_user(){global$b;$Mb=$b->credentials();return$Mb[1];}function
connect(){global$b;$f=new
Min_DB;list($M,$V,$F)=$b->credentials();if($M=="")$M="localhost:27017";$D=array();if($V.$F!=""){$D["username"]=$V;$D["password"]=$F;}$j=$b->database();if($j!="")$D["db"]=$j;if(($Ja=getenv("MONGO_AUTH_SOURCE")))$D["authSource"]=$Ja;$f->connect("mongodb://$M",$D);if($f->error)return$f->error;return$f;}function
alter_indexes($Q,$c){global$f;foreach($c
as$X){list($T,$B,$N)=$X;if($N=="DROP")$I=$f->_db->command(array("deleteIndexes"=>$Q,"index"=>$B));else{$e=array();foreach($N
as$d){$d=preg_replace('~ DESC$~','',$d,1,$Ib);$e[$d]=($Ib?-1:1);}$I=$f->_db->selectCollection($Q)->ensureIndex($e,array("unique"=>($T=="UNIQUE"),"name"=>$B,));}if($I['errmsg']){$f->error=$I['errmsg'];return
false;}}return
true;}function
support($Wc){return
preg_match("~database|indexes|descidx~",$Wc);}function
db_collation($j,$ob){}function
information_schema(){}function
is_view($R){}function
convert_field($m){}function
unconvert_field($m,$I){return$I;}function
foreign_keys($Q){return
array();}function
fk_support($R){}function
engines(){return
array();}function
alter_table($Q,$B,$n,$hd,$ub,$Bc,$nb,$Ka,$Qf){global$f;if($Q==""){$f->_db->createCollection($B);return
true;}}function
drop_tables($S){global$f;foreach($S
as$Q){$Eg=$f->_db->selectCollection($Q)->drop();if(!$Eg['ok'])return
false;}return
true;}function
truncate_tables($S){global$f;foreach($S
as$Q){$Eg=$f->_db->selectCollection($Q)->remove();if(!$Eg['ok'])return
false;}return
true;}function
driver_config(){global$sf;return
array('possible_drivers'=>array("mongo","mongodb"),'jush'=>"mongo",'operators'=>$sf,'functions'=>array(),'grouping'=>array(),'edit_functions'=>array(array("json")),);}}class
Adminer{var$operators;function
name(){return"<a href='https://www.adminer.org/'".target_blank()." id='h1'>Adminer</a>";}function
credentials(){return
array(SERVER,$_GET["username"],get_password());}function
connectSsl(){}function
permanentLogin($h=false){return
password_file($h);}function
bruteForceKey(){return$_SERVER["REMOTE_ADDR"];}function
serverName($M){return
h($M);}function
database(){return
DB;}function
databases($fd=true){return
get_databases($fd);}function
schemas(){return
schemas();}function
queryTimeout(){return
2;}function
headers(){}function
csp(){return
csp();}function
head(){return
true;}function
css(){$I=array();$o="adminer.css";if(file_exists($o))$I[]="$o?v=".crc32(file_get_contents($o));return$I;}function
loginForm(){global$mc;echo"<table cellspacing='0' class='layout'>\n",$this->loginFormField('driver','<tr><th>'.'System'.'<td>',html_select("auth[driver]",$mc,DRIVER,"loginDriver(this);")."\n"),$this->loginFormField('server','<tr><th>'.'Server'.'<td>','<input name="auth[server]" value="'.h(SERVER).'" title="hostname[:port]" placeholder="localhost" autocapitalize="off">'."\n"),$this->loginFormField('username','<tr><th>'.'Username'.'<td>','<input name="auth[username]" id="username" autofocus value="'.h($_GET["username"]).'" autocomplete="username" autocapitalize="off">'.script("qs('#username').form['auth[driver]'].onchange();")),$this->loginFormField('password','<tr><th>'.'Password'.'<td>','<input type="password" name="auth[password]" autocomplete="current-password">'."\n"),$this->loginFormField('db','<tr><th>'.'Database'.'<td>','<input name="auth[db]" value="'.h($_GET["db"]).'" autocapitalize="off">'."\n"),"</table>\n","<p><input type='submit' value='".'Login'."'>\n",checkbox("auth[permanent]",1,$_COOKIE["adminer_permanent"],'Permanent login')."\n";}function
loginFormField($B,$Bd,$Y){return$Bd.$Y;}function
login($we,$F){if($F=="")return
sprintf('Adminer does not support accessing a database without a password, <a href="https://www.adminer.org/en/password/"%s>more information</a>.',target_blank());return
true;}function
tableName($Gh){return
h($Gh["Name"]);}function
fieldName($m,$wf=0){return'<span title="'.h($m["full_type"]).'">'.h($m["field"]).'</span>';}function
selectLinks($Gh,$N=""){global$w,$k;echo'<p class="links">';$ve=array("select"=>'Select data');if(support("table")||support("indexes"))$ve["table"]='Show structure';if(support("table")){if(is_view($Gh))$ve["view"]='Alter view';else$ve["create"]='Alter table';}if($N!==null)$ve["edit"]='New item';$B=$Gh["Name"];foreach($ve
as$x=>$X)echo" <a href='".h(ME)."$x=".urlencode($B).($x=="edit"?$N:"")."'".bold(isset($_GET[$x])).">$X</a>";echo
doc_link(array($w=>$k->tableHelp($B)),"?"),"\n";}function
foreignKeys($Q){return
foreign_keys($Q);}function
backwardKeys($Q,$Fh){return
array();}function
backwardKeysPrint($Na,$J){}function
selectQuery($G,$xh,$Uc=false){global$w,$k;$I="</p>\n";if(!$Uc&&($Wi=$k->warnings())){$Gd="warnings";$I=", <a href='#$Gd'>".'Warnings'."</a>".script("qsl('a').onclick = partial(toggle, '$Gd');","")."$I<div id='$Gd' class='hidden'>\n$Wi</div>\n";}return"<p><code class='jush-$w'>".h(str_replace("\n"," ",$G))."</code> <span class='time'>(".format_time($xh).")</span>".(support("sql")?" <a href='".h(ME)."sql=".urlencode($G)."'>".'Edit'."</a>":"").$I;}function
sqlCommandQuery($G){return
shorten_utf8(trim($G),1000);}function
rowDescription($Q){return"";}function
rowDescriptions($K,$id){return$K;}function
selectLink($X,$m){}function
selectVal($X,$z,$m,$Df){$I=($X===null?"<i>NULL</i>":(preg_match("~char|binary|boolean~",$m["type"])&&!preg_match("~var~",$m["type"])?"<code>$X</code>":$X));if(preg_match('~blob|bytea|raw|file~',$m["type"])&&!is_utf8($X))$I="<i>".lang(array('%d byte','%d bytes'),strlen($Df))."</i>";if(preg_match('~json~',$m["type"]))$I="<code class='jush-js'>$I</code>";return($z?"<a href='".h($z)."'".(is_url($z)?target_blank():"").">$I</a>":$I);}function
editVal($X,$m){return$X;}function
tableStructurePrint($n){echo"<div class='scrollable'>\n","<table cellspacing='0' class='nowrap'>\n","<thead><tr><th>".'Column'."<td>".'Type'.(support("comment")?"<td>".'Comment':"")."</thead>\n";foreach($n
as$m){echo"<tr".odd()."><th>".h($m["field"]),"<td><span title='".h($m["collation"])."'>".h($m["full_type"])."</span>",($m["null"]?" <i>NULL</i>":""),($m["auto_increment"]?" <i>".'Auto Increment'."</i>":""),(isset($m["default"])?" <span title='".'Default value'."'>[<b>".h($m["default"])."</b>]</span>":""),(support("comment")?"<td>".h($m["comment"]):""),"\n";}echo"</table>\n","</div>\n";}function
tableIndexesPrint($v){echo"<table cellspacing='0'>\n";foreach($v
as$B=>$u){ksort($u["columns"]);$hg=array();foreach($u["columns"]as$x=>$X)$hg[]="<i>".h($X)."</i>".($u["lengths"][$x]?"(".$u["lengths"][$x].")":"").($u["descs"][$x]?" DESC":"");echo"<tr title='".h($B)."'><th>$u[type]<td>".implode(", ",$hg)."\n";}echo"</table>\n";}function
selectColumnsPrint($L,$e){global$od,$vd;print_fieldset("select",'Select',$L);$s=0;$L[""]=array();foreach($L
as$x=>$X){$X=$_GET["columns"][$x];$d=select_input(" name='columns[$s][col]'",$e,$X["col"],($x!==""?"selectFieldChange":"selectAddRow"));echo"<div>".($od||$vd?"<select name='columns[$s][fun]'>".optionlist(array(-1=>"")+array_filter(array('Functions'=>$od,'Aggregation'=>$vd)),$X["fun"])."</select>".on_help("getTarget(event).value && getTarget(event).value.replace(/ |\$/, '(') + ')'",1).script("qsl('select').onchange = function () { helpClose();".($x!==""?"":" qsl('select, input', this.parentNode).onchange();")." };","")."($d)":$d)."</div>\n";$s++;}echo"</div></fieldset>\n";}function
selectSearchPrint($Z,$e,$v){print_fieldset("search",'Search',$Z);foreach($v
as$s=>$u){if($u["type"]=="FULLTEXT"){echo"<div>(<i>".implode("</i>, <i>",array_map('h',$u["columns"]))."</i>) AGAINST"," <input type='search' name='fulltext[$s]' value='".h($_GET["fulltext"][$s])."'>",script("qsl('input').oninput = selectFieldChange;",""),checkbox("boolean[$s]",1,isset($_GET["boolean"][$s]),"BOOL"),"</div>\n";}}$ab="this.parentNode.firstChild.onchange();";foreach(array_merge((array)$_GET["where"],array(array()))as$s=>$X){if(!$X||("$X[col]$X[val]"!=""&&in_array($X["op"],$this->operators))){echo"<div>".select_input(" name='where[$s][col]'",$e,$X["col"],($X?"selectFieldChange":"selectAddRow"),"(".'anywhere'.")"),html_select("where[$s][op]",$this->operators,$X["op"],$ab),"<input type='search' name='where[$s][val]' value='".h($X["val"])."'>",script("mixin(qsl('input'), {oninput: function () { $ab }, onkeydown: selectSearchKeydown, onsearch: selectSearchSearch});",""),"</div>\n";}}echo"</div></fieldset>\n";}function
selectOrderPrint($wf,$e,$v){print_fieldset("sort",'Sort',$wf);$s=0;foreach((array)$_GET["order"]as$x=>$X){if($X!=""){echo"<div>".select_input(" name='order[$s]'",$e,$X,"selectFieldChange"),checkbox("desc[$s]",1,isset($_GET["desc"][$x]),'descending')."</div>\n";$s++;}}echo"<div>".select_input(" name='order[$s]'",$e,"","selectAddRow"),checkbox("desc[$s]",1,false,'descending')."</div>\n","</div></fieldset>\n";}function
selectLimitPrint($y){echo"<fieldset><legend>".'Limit'."</legend><div>";echo"<input type='number' name='limit' class='size' value='".h($y)."'>",script("qsl('input').oninput = selectFieldChange;",""),"</div></fieldset>\n";}function
selectLengthPrint($Vh){if($Vh!==null){echo"<fieldset><legend>".'Text length'."</legend><div>","<input type='number' name='text_length' class='size' value='".h($Vh)."'>","</div></fieldset>\n";}}function
selectActionPrint($v){echo"<fieldset><legend>".'Action'."</legend><div>","<input type='submit' value='".'Select'."'>"," <span id='noindex' title='".'Full table scan'."'></span>","<script".nonce().">\n","var indexColumns = ";$e=array();foreach($v
as$u){$Qb=reset($u["columns"]);if($u["type"]!="FULLTEXT"&&$Qb)$e[$Qb]=1;}$e[""]=1;foreach($e
as$x=>$X)json_row($x);echo";\n","selectFieldChange.call(qs('#form')['select']);\n","</script>\n","</div></fieldset>\n";}function
selectCommandPrint(){return!information_schema(DB);}function
selectImportPrint(){return!information_schema(DB);}function
selectEmailPrint($zc,$e){}function
selectColumnsProcess($e,$v){global$od,$vd;$L=array();$sd=array();foreach((array)$_GET["columns"]as$x=>$X){if($X["fun"]=="count"||($X["col"]!=""&&(!$X["fun"]||in_array($X["fun"],$od)||in_array($X["fun"],$vd)))){$L[$x]=apply_sql_function($X["fun"],($X["col"]!=""?idf_escape($X["col"]):"*"));if(!in_array($X["fun"],$vd))$sd[]=$L[$x];}}return
array($L,$sd);}function
selectSearchProcess($n,$v){global$f,$k;$I=array();foreach($v
as$s=>$u){if($u["type"]=="FULLTEXT"&&$_GET["fulltext"][$s]!="")$I[]="MATCH (".implode(", ",array_map('idf_escape',$u["columns"])).") AGAINST (".q($_GET["fulltext"][$s]).(isset($_GET["boolean"][$s])?" IN BOOLEAN MODE":"").")";}foreach((array)$_GET["where"]as$x=>$X){if("$X[col]$X[val]"!=""&&in_array($X["op"],$this->operators)){$dg="";$xb=" $X[op]";if(preg_match('~IN$~',$X["op"])){$Kd=process_length($X["val"]);$xb.=" ".($Kd!=""?$Kd:"(NULL)");}elseif($X["op"]=="SQL")$xb=" $X[val]";elseif($X["op"]=="LIKE %%")$xb=" LIKE ".$this->processInput($n[$X["col"]],"%$X[val]%");elseif($X["op"]=="ILIKE %%")$xb=" ILIKE ".$this->processInput($n[$X["col"]],"%$X[val]%");elseif($X["op"]=="FIND_IN_SET"){$dg="$X[op](".q($X["val"]).", ";$xb=")";}elseif(!preg_match('~NULL$~',$X["op"]))$xb.=" ".$this->processInput($n[$X["col"]],$X["val"]);if($X["col"]!="")$I[]=$dg.$k->convertSearch(idf_escape($X["col"]),$X,$n[$X["col"]]).$xb;else{$qb=array();foreach($n
as$B=>$m){if((preg_match('~^[-\d.'.(preg_match('~IN$~',$X["op"])?',':'').']+$~',$X["val"])||!preg_match('~'.number_type().'|bit~',$m["type"]))&&(!preg_match("~[\x80-\xFF]~",$X["val"])||preg_match('~char|text|enum|set~',$m["type"]))&&(!preg_match('~date|timestamp~',$m["type"])||preg_match('~^\d+-\d+-\d+~',$X["val"])))$qb[]=$dg.$k->convertSearch(idf_escape($B),$X,$m).$xb;}$I[]=($qb?"(".implode(" OR ",$qb).")":"1 = 0");}}}return$I;}function
selectOrderProcess($n,$v){$I=array();foreach((array)$_GET["order"]as$x=>$X){if($X!="")$I[]=(preg_match('~^((COUNT\(DISTINCT |[A-Z0-9_]+\()(`(?:[^`]|``)+`|"(?:[^"]|"")+")\)|COUNT\(\*\))$~',$X)?$X:idf_escape($X)).(isset($_GET["desc"][$x])?" DESC":"");}return$I;}function
selectLimitProcess(){return(isset($_GET["limit"])?$_GET["limit"]:"50");}function
selectLengthProcess(){return(isset($_GET["text_length"])?$_GET["text_length"]:"100");}function
selectEmailProcess($Z,$id){return
false;}function
selectQueryBuild($L,$Z,$sd,$wf,$y,$E){return"";}function
messageQuery($G,$Wh,$Uc=false){global$w,$k;restart_session();$Cd=&get_session("queries");if(!$Cd[$_GET["db"]])$Cd[$_GET["db"]]=array();if(strlen($G)>1e6)$G=preg_replace('~[\x80-\xFF]+$~','',substr($G,0,1e6))."\nâ€¦";$Cd[$_GET["db"]][]=array($G,time(),$Wh);$uh="sql-".count($Cd[$_GET["db"]]);$I="<a href='#$uh' class='toggle'>".'SQL command'."</a>\n";if(!$Uc&&($Wi=$k->warnings())){$Gd="warnings-".count($Cd[$_GET["db"]]);$I="<a href='#$Gd' class='toggle'>".'Warnings'."</a>, $I<div id='$Gd' class='hidden'>\n$Wi</div>\n";}return" <span class='time'>".@date("H:i:s")."</span>"." $I<div id='$uh' class='hidden'><pre><code class='jush-$w'>".shorten_utf8($G,1000)."</code></pre>".($Wh?" <span class='time'>($Wh)</span>":'').(support("sql")?'<p><a href="'.h(str_replace("db=".urlencode(DB),"db=".urlencode($_GET["db"]),ME).'sql=&history='.(count($Cd[$_GET["db"]])-1)).'">'.'Edit'.'</a>':'').'</div>';}function
editRowPrint($Q,$n,$J,$Ci){}function
editFunctions($m){global$uc;$I=($m["null"]?"NULL/":"");$Ci=isset($_GET["select"])||where($_GET);foreach($uc
as$x=>$od){if(!$x||(!isset($_GET["call"])&&$Ci)){foreach($od
as$Uf=>$X){if(!$Uf||preg_match("~$Uf~",$m["type"]))$I.="/$X";}}if($x&&!preg_match('~set|blob|bytea|raw|file|bool~',$m["type"]))$I.="/SQL";}if($m["auto_increment"]&&!$Ci)$I='Auto Increment';return
explode("/",$I);}function
editInput($Q,$m,$Ha,$Y){if($m["type"]=="enum")return(isset($_GET["select"])?"<label><input type='radio'$Ha value='-1' checked><i>".'original'."</i></label> ":"").($m["null"]?"<label><input type='radio'$Ha value=''".($Y!==null||isset($_GET["select"])?"":" checked")."><i>NULL</i></label> ":"").enum_input("radio",$Ha,$m,$Y,0);return"";}function
editHint($Q,$m,$Y){return"";}function
processInput($m,$Y,$r=""){if($r=="SQL")return$Y;$B=$m["field"];$I=q($Y);if(preg_match('~^(now|getdate|uuid)$~',$r))$I="$r()";elseif(preg_match('~^current_(date|timestamp)$~',$r))$I=$r;elseif(preg_match('~^([+-]|\|\|)$~',$r))$I=idf_escape($B)." $r $I";elseif(preg_match('~^[+-] interval$~',$r))$I=idf_escape($B)." $r ".(preg_match("~^(\\d+|'[0-9.: -]') [A-Z_]+\$~i",$Y)?$Y:$I);elseif(preg_match('~^(addtime|subtime|concat)$~',$r))$I="$r(".idf_escape($B).", $I)";elseif(preg_match('~^(md5|sha1|password|encrypt)$~',$r))$I="$r($I)";return
unconvert_field($m,$I);}function
dumpOutput(){$I=array('text'=>'open','file'=>'save');if(function_exists('gzencode'))$I['gz']='gzip';return$I;}function
dumpFormat(){return
array('sql'=>'SQL','csv'=>'CSV,','csv;'=>'CSV;','tsv'=>'TSV');}function
dumpDatabase($j){}function
dumpTable($Q,$Ah,$be=0){if($_POST["format"]!="sql"){echo"\xef\xbb\xbf";if($Ah)dump_csv(array_keys(fields($Q)));}else{if($be==2){$n=array();foreach(fields($Q)as$B=>$m)$n[]=idf_escape($B)." $m[full_type]";$h="CREATE TABLE ".table($Q)." (".implode(", ",$n).")";}else$h=create_sql($Q,$_POST["auto_increment"],$Ah);set_utf8mb4($h);if($Ah&&$h){if($Ah=="DROP+CREATE"||$be==1)echo"DROP ".($be==2?"VIEW":"TABLE")." IF EXISTS ".table($Q).";\n";if($be==1)$h=remove_definer($h);echo"$h;\n\n";}}}function
dumpData($Q,$Ah,$G){global$f,$w;$Ce=($w=="sqlite"?0:1048576);if($Ah){if($_POST["format"]=="sql"){if($Ah=="TRUNCATE+INSERT")echo
truncate_sql($Q).";\n";$n=fields($Q);}$H=$f->query($G,1);if($H){$Ud="";$Va="";$ge=array();$pd=array();$Ch="";$Xc=($Q!=''?'fetch_assoc':'fetch_row');while($J=$H->$Xc()){if(!$ge){$Oi=array();foreach($J
as$X){$m=$H->fetch_field();if($n[$m->name]['generated']){$pd[$m->name]=true;continue;}$ge[]=$m->name;$x=idf_escape($m->name);$Oi[]="$x = VALUES($x)";}$Ch=($Ah=="INSERT+UPDATE"?"\nON DUPLICATE KEY UPDATE ".implode(", ",$Oi):"").";\n";}if($_POST["format"]!="sql"){if($Ah=="table"){dump_csv($ge);$Ah="INSERT";}dump_csv($J);}else{if(!$Ud)$Ud="INSERT INTO ".table($Q)." (".implode(", ",array_map('idf_escape',$ge)).") VALUES";foreach($J
as$x=>$X){if($pd[$x]){unset($J[$x]);continue;}$m=$n[$x];$J[$x]=($X!==null?unconvert_field($m,preg_match(number_type(),$m["type"])&&!preg_match('~\[~',$m["full_type"])&&is_numeric($X)?$X:q(($X===false?0:$X))):"NULL");}$Qg=($Ce?"\n":" ")."(".implode(",\t",$J).")";if(!$Va)$Va=$Ud.$Qg;elseif(strlen($Va)+4+strlen($Qg)+strlen($Ch)<$Ce)$Va.=",$Qg";else{echo$Va.$Ch;$Va=$Ud.$Qg;}}}if($Va)echo$Va.$Ch;}elseif($_POST["format"]=="sql")echo"-- ".str_replace("\n"," ",$f->error)."\n";}}function
dumpFilename($Hd){return
friendly_url($Hd!=""?$Hd:(SERVER!=""?SERVER:"localhost"));}function
dumpHeaders($Hd,$Re=false){$Gf=$_POST["output"];$Qc=(preg_match('~sql~',$_POST["format"])?"sql":($Re?"tar":"csv"));header("Content-Type: ".($Gf=="gz"?"application/x-gzip":($Qc=="tar"?"application/x-tar":($Qc=="sql"||$Gf!="file"?"text/plain":"text/csv")."; charset=utf-8")));if($Gf=="gz")ob_start('ob_gzencode',1e6);return$Qc;}function
importServerPath(){return"adminer.sql";}function
homepage(){echo'<p class="links">'.($_GET["ns"]==""&&support("database")?'<a href="'.h(ME).'database=">'.'Alter database'."</a>\n":""),(support("scheme")?"<a href='".h(ME)."scheme='>".($_GET["ns"]!=""?'Alter schema':'Create schema')."</a>\n":""),($_GET["ns"]!==""?'<a href="'.h(ME).'schema=">'.'Database schema'."</a>\n":""),(support("privileges")?"<a href='".h(ME)."privileges='>".'Privileges'."</a>\n":"");return
true;}function
navigation($Qe){global$ia,$w,$mc,$f;echo'<h1>
',$this->name(),'<span class="version">
',$ia,' <a href="https://www.adminer.org/#download"',target_blank(),' id="version">',(version_compare($ia,$_COOKIE["adminer_version"])<0?h($_COOKIE["adminer_version"]):""),'</a>
</span>
</h1>
';if($Qe=="auth"){$Gf="";foreach((array)$_SESSION["pwds"]as$Qi=>$fh){foreach($fh
as$M=>$Ki){foreach($Ki
as$V=>$F){if($F!==null){$Xb=$_SESSION["db"][$Qi][$M][$V];foreach(($Xb?array_keys($Xb):array(""))as$j)$Gf.="<li><a href='".h(auth_url($Qi,$M,$V,$j))."'>($mc[$Qi]) ".h($V.($M!=""?"@".$this->serverName($M):"").($j!=""?" - $j":""))."</a>\n";}}}}if($Gf)echo"<ul id='logins'>\n$Gf</ul>\n".script("mixin(qs('#logins'), {onmouseover: menuOver, onmouseout: menuOut});");}else{$S=array();if($_GET["ns"]!==""&&!$Qe&&DB!=""){$f->select_db(DB);$S=table_status('',true);}echo
script_src(preg_replace("~\\?.*~","",ME)."?file=jush.js&version=4.16.0");if(support("sql")){echo'<script',nonce(),'>
';if($S){$ve=array();foreach($S
as$Q=>$T)$ve[]=preg_quote($Q,'/');echo"var jushLinks = { $w: [ '".js_escape(ME).(support("table")?"table=":"select=")."\$&', /\\b(".implode("|",$ve).")\\b/g ] };\n";foreach(array("bac","bra","sqlite_quo","mssql_bra")as$X)echo"jushLinks.$X = jushLinks.$w;\n";}$eh=$f->server_info;echo'bodyLoad(\'',(is_object($f)?preg_replace('~^(\d\.?\d).*~s','\1',$eh):""),'\'',(preg_match('~MariaDB~',$eh)?", true":""),');
</script>
';}$this->databasesPrint($Qe);$va=array();if(DB==""||!$Qe){if(support("sql")){$va[]="<a href='".h(ME)."sql='".bold(isset($_GET["sql"])&&!isset($_GET["import"])).">".'SQL command'."</a>";$va[]="<a href='".h(ME)."import='".bold(isset($_GET["import"])).">".'Import'."</a>";}if(support("dump"))$va[]="<a href='".h(ME)."dump=".urlencode(isset($_GET["table"])?$_GET["table"]:$_GET["select"])."' id='dump'".bold(isset($_GET["dump"])).">".'Export'."</a>";}$Ld=$_GET["ns"]!==""&&!$Qe&&DB!="";if($Ld)$va[]='<a href="'.h(ME).'create="'.bold($_GET["create"]==="").">".'Create table'."</a>";echo($va?"<p class='links'>\n".implode("\n",$va)."\n":"");if($Ld){if($S)$this->tablesPrint($S);else
echo"<p class='message'>".'No tables.'."</p>\n";}}}function
databasesPrint($Qe){global$b,$f;$i=$this->databases();if(DB&&$i&&!in_array(DB,$i))array_unshift($i,DB);echo'<form action="">
<p id="dbs">
';hidden_fields_get();$Vb=script("mixin(qsl('select'), {onmousedown: dbMouseDown, onchange: dbChange});");echo"<span title='".'Database'."'>".'DB'."</span>: ".($i?"<select name='db'>".optionlist(array(""=>"")+$i,DB)."</select>$Vb":"<input name='db' value='".h(DB)."' autocapitalize='off'>\n"),"<input type='submit' value='".'Use'."'".($i?" class='hidden'":"").">\n";if(support("scheme")){if($Qe!="db"&&DB!=""&&$f->select_db(DB)){echo"<br>".'Schema'.": <select name='ns'>".optionlist(array(""=>"")+$b->schemas(),$_GET["ns"])."</select>$Vb";if($_GET["ns"]!="")set_schema($_GET["ns"]);}}foreach(array("import","sql","schema","dump","privileges")as$X){if(isset($_GET[$X])){echo"<input type='hidden' name='$X' value=''>";break;}}echo"</p></form>\n";}function
tablesPrint($S){echo"<ul id='tables'>".script("mixin(qs('#tables'), {onmouseover: menuOver, onmouseout: menuOut});");foreach($S
as$Q=>$O){$B=$this->tableName($O);if($B!=""){echo'<li><a href="'.h(ME).'select='.urlencode($Q).'"'.bold($_GET["select"]==$Q||$_GET["edit"]==$Q,"select")." title='".'Select data'."'>".'select'."</a> ",(support("table")||support("indexes")?'<a href="'.h(ME).'table='.urlencode($Q).'"'.bold(in_array($Q,array($_GET["table"],$_GET["create"],$_GET["indexes"],$_GET["foreign"],$_GET["trigger"])),(is_view($O)?"view":"structure"))." title='".'Show structure'."'>$B</a>":"<span>$B</span>")."\n";}}echo"</ul>\n";}}$b=(function_exists('adminer_object')?adminer_object():new
Adminer);$mc=array("server"=>"MySQL")+$mc;if(!defined("DRIVER")){define("DRIVER","server");if(extension_loaded("mysqli")){class
Min_DB
extends
MySQLi{var$extension="MySQLi";function
__construct(){parent::init();}function
connect($M="",$V="",$F="",$Tb=null,$Yf=null,$nh=null){global$b;mysqli_report(MYSQLI_REPORT_OFF);list($Ed,$Yf)=explode(":",$M,2);$wh=$b->connectSsl();if($wh)$this->ssl_set($wh['key'],$wh['cert'],$wh['ca'],'','');$I=@$this->real_connect(($M!=""?$Ed:ini_get("mysqli.default_host")),($M.$V!=""?$V:ini_get("mysqli.default_user")),($M.$V.$F!=""?$F:ini_get("mysqli.default_pw")),$Tb,(is_numeric($Yf)?$Yf:ini_get("mysqli.default_port")),(!is_numeric($Yf)?$Yf:$nh),($wh?(empty($wh['cert'])?2048:64):0));$this->options(MYSQLI_OPT_LOCAL_INFILE,false);return$I;}function
set_charset($bb){if(parent::set_charset($bb))return
true;parent::set_charset('utf8');return$this->query("SET NAMES $bb");}function
result($G,$m=0){$H=$this->query($G);if(!$H)return
false;$J=$H->fetch_array();return$J[$m];}function
quote($P){return"'".$this->escape_string($P)."'";}}}elseif(extension_loaded("mysql")&&!((ini_bool("sql.safe_mode")||ini_bool("mysql.allow_local_infile"))&&extension_loaded("pdo_mysql"))){class
Min_DB{var$extension="MySQL",$server_info,$affected_rows,$errno,$error,$_link,$_result;function
connect($M,$V,$F){if(ini_bool("mysql.allow_local_infile")){$this->error=sprintf('Disable %s or enable %s or %s extensions.',"'mysql.allow_local_infile'","MySQLi","PDO_MySQL");return
false;}$this->_link=@mysql_connect(($M!=""?$M:ini_get("mysql.default_host")),("$M$V"!=""?$V:ini_get("mysql.default_user")),("$M$V$F"!=""?$F:ini_get("mysql.default_password")),true,131072);if($this->_link)$this->server_info=mysql_get_server_info($this->_link);else$this->error=mysql_error();return(bool)$this->_link;}function
set_charset($bb){if(function_exists('mysql_set_charset')){if(mysql_set_charset($bb,$this->_link))return
true;mysql_set_charset('utf8',$this->_link);}return$this->query("SET NAMES $bb");}function
quote($P){return"'".mysql_real_escape_string($P,$this->_link)."'";}function
select_db($Tb){return
mysql_select_db($Tb,$this->_link);}function
query($G,$vi=false){$H=@($vi?mysql_unbuffered_query($G,$this->_link):mysql_query($G,$this->_link));$this->error="";if(!$H){$this->errno=mysql_errno($this->_link);$this->error=mysql_error($this->_link);return
false;}if($H===true){$this->affected_rows=mysql_affected_rows($this->_link);$this->info=mysql_info($this->_link);return
true;}return
new
Min_Result($H);}function
multi_query($G){return$this->_result=$this->query($G);}function
store_result(){return$this->_result;}function
next_result(){return
false;}function
result($G,$m=0){$H=$this->query($G);if(!$H||!$H->num_rows)return
false;return
mysql_result($H->_result,0,$m);}}class
Min_Result{var$num_rows,$_result,$_offset=0;function
__construct($H){$this->_result=$H;$this->num_rows=mysql_num_rows($H);}function
fetch_assoc(){return
mysql_fetch_assoc($this->_result);}function
fetch_row(){return
mysql_fetch_row($this->_result);}function
fetch_field(){$I=mysql_fetch_field($this->_result,$this->_offset++);$I->orgtable=$I->table;$I->orgname=$I->name;$I->charsetnr=($I->blob?63:0);return$I;}function
__destruct(){mysql_free_result($this->_result);}}}elseif(extension_loaded("pdo_mysql")){class
Min_DB
extends
Min_PDO{var$extension="PDO_MySQL";function
connect($M,$V,$F){global$b;$D=array(PDO::MYSQL_ATTR_LOCAL_INFILE=>false);$wh=$b->connectSsl();if($wh){if(!empty($wh['key']))$D[PDO::MYSQL_ATTR_SSL_KEY]=$wh['key'];if(!empty($wh['cert']))$D[PDO::MYSQL_ATTR_SSL_CERT]=$wh['cert'];if(!empty($wh['ca']))$D[PDO::MYSQL_ATTR_SSL_CA]=$wh['ca'];if(!empty($wh['verify']))$D[PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT]=$wh['verify'];}$this->dsn("mysql:charset=utf8;host=".str_replace(":",";unix_socket=",preg_replace('~:(\d)~',';port=\1',$M)),$V,$F,$D);return
true;}function
set_charset($bb){$this->query("SET NAMES $bb");}function
select_db($Tb){return$this->query("USE ".idf_escape($Tb));}function
query($G,$vi=false){$this->pdo->setAttribute(PDO::MYSQL_ATTR_USE_BUFFERED_QUERY,!$vi);return
parent::query($G,$vi);}}}class
Min_Driver
extends
Min_SQL{function
insert($Q,$N){return($N?parent::insert($Q,$N):queries("INSERT INTO ".table($Q)." ()\nVALUES ()"));}function
insertUpdate($Q,$K,$fg){$e=array_keys(reset($K));$dg="INSERT INTO ".table($Q)." (".implode(", ",$e).") VALUES\n";$Oi=array();foreach($e
as$x)$Oi[$x]="$x = VALUES($x)";$Ch="\nON DUPLICATE KEY UPDATE ".implode(", ",$Oi);$Oi=array();$se=0;foreach($K
as$N){$Y="(".implode(", ",$N).")";if($Oi&&(strlen($dg)+$se+strlen($Y)+strlen($Ch)>1e6)){if(!queries($dg.implode(",\n",$Oi).$Ch))return
false;$Oi=array();$se=0;}$Oi[]=$Y;$se+=strlen($Y)+2;}return
queries($dg.implode(",\n",$Oi).$Ch);}function
slowQuery($G,$Xh){if(min_version('5.7.8','10.1.2')){if(preg_match('~MariaDB~',$this->_conn->server_info))return"SET STATEMENT max_statement_time=$Xh FOR $G";elseif(preg_match('~^(SELECT\b)(.+)~is',$G,$A))return"$A[1] /*+ MAX_EXECUTION_TIME(".($Xh*1000).") */ $A[2]";}}function
convertSearch($t,$X,$m){return(preg_match('~char|text|enum|set~',$m["type"])&&!preg_match("~^utf8~",$m["collation"])&&preg_match('~[\x80-\xFF]~',$X['val'])?"CONVERT($t USING ".charset($this->_conn).")":$t);}function
warnings(){$H=$this->_conn->query("SHOW WARNINGS");if($H&&$H->num_rows){ob_start();select($H);return
ob_get_clean();}}function
tableHelp($B){$ye=preg_match('~MariaDB~',$this->_conn->server_info);if(information_schema(DB))return
strtolower(($ye?"information-schema-$B-table/":str_replace("_","-",$B)."-table.html"));if(DB=="mysql")return($ye?"mysql$B-table/":"system-database.html");}}function
idf_escape($t){return"`".str_replace("`","``",$t)."`";}function
table($t){return
idf_escape($t);}function
connect(){global$b,$U,$_h,$uc;$f=new
Min_DB;$Mb=$b->credentials();if($f->connect($Mb[0],$Mb[1],$Mb[2])){$f->set_charset(charset($f));$f->query("SET sql_quote_show_create = 1, autocommit = 1");if(min_version('5.7.8',10.2,$f)){$_h['Strings'][]="json";$U["json"]=4294967295;}if(min_version('',10.7,$f)){$_h['Strings'][]="uuid";$U["uuid"]=128;$uc[0]['uuid']='uuid';}return$f;}$I=$f->error;if(function_exists('iconv')&&!is_utf8($I)&&strlen($Qg=iconv("windows-1250","utf-8",$I))>strlen($I))$I=$Qg;return$I;}function
get_databases($fd){$I=get_session("dbs");if($I===null){$G=(min_version(5)?"SELECT SCHEMA_NAME FROM information_schema.SCHEMATA ORDER BY SCHEMA_NAME":"SHOW DATABASES");$I=($fd?slow_query($G):get_vals($G));restart_session();set_session("dbs",$I);stop_session();}return$I;}function
limit($G,$Z,$y,$C=0,$ah=" "){return" $G$Z".($y!==null?$ah."LIMIT $y".($C?" OFFSET $C":""):"");}function
limit1($Q,$G,$Z,$ah="\n"){return
limit($G,$Z,1,0,$ah);}function
db_collation($j,$ob){global$f;$I=null;$h=$f->result("SHOW CREATE DATABASE ".idf_escape($j),1);if(preg_match('~ COLLATE ([^ ]+)~',$h,$A))$I=$A[1];elseif(preg_match('~ CHARACTER SET ([^ ]+)~',$h,$A))$I=$ob[$A[1]][-1];return$I;}function
engines(){$I=array();foreach(get_rows("SHOW ENGINES")as$J){if(preg_match("~YES|DEFAULT~",$J["Support"]))$I[]=$J["Engine"];}return$I;}function
logged_user(){global$f;return$f->result("SELECT USER()");}function
tables_list(){return
get_key_vals(min_version(5)?"SELECT TABLE_NAME, TABLE_TYPE FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() ORDER BY TABLE_NAME":"SHOW TABLES");}function
count_tables($i){$I=array();foreach($i
as$j)$I[$j]=count(get_vals("SHOW TABLES IN ".idf_escape($j)));return$I;}function
table_status($B="",$Vc=false){$I=array();foreach(get_rows($Vc&&min_version(5)?"SELECT TABLE_NAME AS Name, ENGINE AS Engine, TABLE_COMMENT AS Comment FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() ".($B!=""?"AND TABLE_NAME = ".q($B):"ORDER BY Name"):"SHOW TABLE STATUS".($B!=""?" LIKE ".q(addcslashes($B,"%_\\")):""))as$J){if($J["Engine"]=="InnoDB")$J["Comment"]=preg_replace('~(?:(.+); )?InnoDB free: .*~','\1',$J["Comment"]);if(!isset($J["Engine"]))$J["Comment"]="";if($B!=""){$J["Name"]=$B;return$J;}$I[$J["Name"]]=$J;}return$I;}function
is_view($R){return$R["Engine"]===null;}function
fk_support($R){return
preg_match('~InnoDB|IBMDB2I~i',$R["Engine"])||(preg_match('~NDB~i',$R["Engine"])&&min_version(5.6));}function
fields($Q){$I=array();foreach(get_rows("SHOW FULL COLUMNS FROM ".table($Q))as$J){preg_match('~^([^( ]+)(?:\((.+)\))?( unsigned)?( zerofill)?$~',$J["Type"],$A);$I[$J["Field"]]=array("field"=>$J["Field"],"full_type"=>$J["Type"],"type"=>$A[1],"length"=>$A[2],"unsigned"=>ltrim($A[3].$A[4]),"default"=>($J["Default"]!=""||preg_match("~char|set~",$A[1])?(preg_match('~text~',$A[1])?stripslashes(preg_replace("~^'(.*)'\$~",'\1',$J["Default"])):$J["Default"]):null),"null"=>($J["Null"]=="YES"),"auto_increment"=>($J["Extra"]=="auto_increment"),"on_update"=>(preg_match('~^on update (.+)~i',$J["Extra"],$A)?$A[1]:""),"collation"=>$J["Collation"],"privileges"=>array_flip(preg_split('~, *~',$J["Privileges"])),"comment"=>$J["Comment"],"primary"=>($J["Key"]=="PRI"),"generated"=>preg_match('~^(VIRTUAL|PERSISTENT|STORED)~',$J["Extra"]),);}return$I;}function
indexes($Q,$g=null){$I=array();foreach(get_rows("SHOW INDEX FROM ".table($Q),$g)as$J){$B=$J["Key_name"];$I[$B]["type"]=($B=="PRIMARY"?"PRIMARY":($J["Index_type"]=="FULLTEXT"?"FULLTEXT":($J["Non_unique"]?($J["Index_type"]=="SPATIAL"?"SPATIAL":"INDEX"):"UNIQUE")));$I[$B]["columns"][]=$J["Column_name"];$I[$B]["lengths"][]=($J["Index_type"]=="SPATIAL"?null:$J["Sub_part"]);$I[$B]["descs"][]=null;}return$I;}function
foreign_keys($Q){global$f,$nf;static$Uf='(?:`(?:[^`]|``)+`|"(?:[^"]|"")+")';$I=array();$Kb=$f->result("SHOW CREATE TABLE ".table($Q),1);if($Kb){preg_match_all("~CONSTRAINT ($Uf) FOREIGN KEY ?\\(((?:$Uf,? ?)+)\\) REFERENCES ($Uf)(?:\\.($Uf))? \\(((?:$Uf,? ?)+)\\)(?: ON DELETE ($nf))?(?: ON UPDATE ($nf))?~",$Kb,$Ae,PREG_SET_ORDER);foreach($Ae
as$A){preg_match_all("~$Uf~",$A[2],$ph);preg_match_all("~$Uf~",$A[5],$Ph);$I[idf_unescape($A[1])]=array("db"=>idf_unescape($A[4]!=""?$A[3]:$A[4]),"table"=>idf_unescape($A[4]!=""?$A[4]:$A[3]),"source"=>array_map('idf_unescape',$ph[0]),"target"=>array_map('idf_unescape',$Ph[0]),"on_delete"=>($A[6]?$A[6]:"RESTRICT"),"on_update"=>($A[7]?$A[7]:"RESTRICT"),);}}return$I;}function
view($B){global$f;return
array("select"=>preg_replace('~^(?:[^`]|`[^`]*`)*\s+AS\s+~isU','',$f->result("SHOW CREATE VIEW ".table($B),1)));}function
collations(){$I=array();foreach(get_rows("SHOW COLLATION")as$J){if($J["Default"])$I[$J["Charset"]][-1]=$J["Collation"];else$I[$J["Charset"]][]=$J["Collation"];}ksort($I);foreach($I
as$x=>$X)asort($I[$x]);return$I;}function
information_schema($j){return(min_version(5)&&$j=="information_schema")||(min_version(5.5)&&$j=="performance_schema");}function
error(){global$f;return
h(preg_replace('~^You have an error.*syntax to use~U',"Syntax error",$f->error));}function
create_database($j,$nb){return
queries("CREATE DATABASE ".idf_escape($j).($nb?" COLLATE ".q($nb):""));}function
drop_databases($i){$I=apply_queries("DROP DATABASE",$i,'idf_escape');restart_session();set_session("dbs",null);return$I;}function
rename_database($B,$nb){$I=false;if(create_database($B,$nb)){$S=array();$Ti=array();foreach(tables_list()as$Q=>$T){if($T=='VIEW')$Ti[]=$Q;else$S[]=$Q;}$I=(!$S&&!$Ti)||move_tables($S,$Ti,$B);drop_databases($I?array(DB):array());}return$I;}function
auto_increment(){$La=" PRIMARY KEY";if($_GET["create"]!=""&&$_POST["auto_increment_col"]){foreach(indexes($_GET["create"])as$u){if(in_array($_POST["fields"][$_POST["auto_increment_col"]]["orig"],$u["columns"],true)){$La="";break;}if($u["type"]=="PRIMARY")$La=" UNIQUE";}}return" AUTO_INCREMENT$La";}function
alter_table($Q,$B,$n,$hd,$ub,$Bc,$nb,$Ka,$Qf){$c=array();foreach($n
as$m)$c[]=($m[1]?($Q!=""?($m[0]!=""?"CHANGE ".idf_escape($m[0]):"ADD"):" ")." ".implode($m[1]).($Q!=""?$m[2]:""):"DROP ".idf_escape($m[0]));$c=array_merge($c,$hd);$O=($ub!==null?" COMMENT=".q($ub):"").($Bc?" ENGINE=".q($Bc):"").($nb?" COLLATE ".q($nb):"").($Ka!=""?" AUTO_INCREMENT=$Ka":"");if($Q=="")return
queries("CREATE TABLE ".table($B)." (\n".implode(",\n",$c)."\n)$O$Qf");if($Q!=$B)$c[]="RENAME TO ".table($B);if($O)$c[]=ltrim($O);return($c||$Qf?queries("ALTER TABLE ".table($Q)."\n".implode(",\n",$c).$Qf):true);}function
alter_indexes($Q,$c){foreach($c
as$x=>$X)$c[$x]=($X[2]=="DROP"?"\nDROP INDEX ".idf_escape($X[1]):"\nADD $X[0] ".($X[0]=="PRIMARY"?"KEY ":"").($X[1]!=""?idf_escape($X[1])." ":"")."(".implode(", ",$X[2]).")");return
queries("ALTER TABLE ".table($Q).implode(",",$c));}function
truncate_tables($S){return
apply_queries("TRUNCATE TABLE",$S);}function
drop_views($Ti){return
queries("DROP VIEW ".implode(", ",array_map('table',$Ti)));}function
drop_tables($S){return
queries("DROP TABLE ".implode(", ",array_map('table',$S)));}function
move_tables($S,$Ti,$Ph){global$f;$Cg=array();foreach($S
as$Q)$Cg[]=table($Q)." TO ".idf_escape($Ph).".".table($Q);if(!$Cg||queries("RENAME TABLE ".implode(", ",$Cg))){$cc=array();foreach($Ti
as$Q)$cc[table($Q)]=view($Q);$f->select_db($Ph);$j=idf_escape(DB);foreach($cc
as$B=>$Si){if(!queries("CREATE VIEW $B AS ".str_replace(" $j."," ",$Si["select"]))||!queries("DROP VIEW $j.$B"))return
false;}return
true;}return
false;}function
copy_tables($S,$Ti,$Ph){queries("SET sql_mode = 'NO_AUTO_VALUE_ON_ZERO'");foreach($S
as$Q){$B=($Ph==DB?table("copy_$Q"):idf_escape($Ph).".".table($Q));if(($_POST["overwrite"]&&!queries("\nDROP TABLE IF EXISTS $B"))||!queries("CREATE TABLE $B LIKE ".table($Q))||!queries("INSERT INTO $B SELECT * FROM ".table($Q)))return
false;foreach(get_rows("SHOW TRIGGERS LIKE ".q(addcslashes($Q,"%_\\")))as$J){$pi=$J["Trigger"];if(!queries("CREATE TRIGGER ".($Ph==DB?idf_escape("copy_$pi"):idf_escape($Ph).".".idf_escape($pi))." $J[Timing] $J[Event] ON $B FOR EACH ROW\n$J[Statement];"))return
false;}}foreach($Ti
as$Q){$B=($Ph==DB?table("copy_$Q"):idf_escape($Ph).".".table($Q));$Si=view($Q);if(($_POST["overwrite"]&&!queries("DROP VIEW IF EXISTS $B"))||!queries("CREATE VIEW $B AS $Si[select]"))return
false;}return
true;}function
trigger($B){if($B=="")return
array();$K=get_rows("SHOW TRIGGERS WHERE `Trigger` = ".q($B));return
reset($K);}function
triggers($Q){$I=array();foreach(get_rows("SHOW TRIGGERS LIKE ".q(addcslashes($Q,"%_\\")))as$J)$I[$J["Trigger"]]=array($J["Timing"],$J["Event"]);return$I;}function
trigger_options(){return
array("Timing"=>array("BEFORE","AFTER"),"Event"=>array("INSERT","UPDATE","DELETE"),"Type"=>array("FOR EACH ROW"),);}function
routine($B,$T){global$f,$Dc,$Sd,$U;$Ba=array("bool","boolean","integer","double precision","real","dec","numeric","fixed","national char","national varchar");$qh="(?:\\s|/\\*[\s\S]*?\\*/|(?:#|-- )[^\n]*\n?|--\r?\n)";$ui="((".implode("|",array_merge(array_keys($U),$Ba)).")\\b(?:\\s*\\(((?:[^'\")]|$Dc)++)\\))?\\s*(zerofill\\s*)?(unsigned(?:\\s+zerofill)?)?)(?:\\s*(?:CHARSET|CHARACTER\\s+SET)\\s*['\"]?([^'\"\\s,]+)['\"]?)?";$Uf="$qh*(".($T=="FUNCTION"?"":$Sd).")?\\s*(?:`((?:[^`]|``)*)`\\s*|\\b(\\S+)\\s+)$ui";$h=$f->result("SHOW CREATE $T ".idf_escape($B),2);preg_match("~\\(((?:$Uf\\s*,?)*)\\)\\s*".($T=="FUNCTION"?"RETURNS\\s+$ui\\s+":"")."(.*)~is",$h,$A);$n=array();preg_match_all("~$Uf\\s*,?~is",$A[1],$Ae,PREG_SET_ORDER);foreach($Ae
as$Kf)$n[]=array("field"=>str_replace("``","`",$Kf[2]).$Kf[3],"type"=>strtolower($Kf[5]),"length"=>preg_replace_callback("~$Dc~s",'normalize_enum',$Kf[6]),"unsigned"=>strtolower(preg_replace('~\s+~',' ',trim("$Kf[8] $Kf[7]"))),"null"=>1,"full_type"=>$Kf[4],"inout"=>strtoupper($Kf[1]),"collation"=>strtolower($Kf[9]),);if($T!="FUNCTION")return
array("fields"=>$n,"definition"=>$A[11]);return
array("fields"=>$n,"returns"=>array("type"=>$A[12],"length"=>$A[13],"unsigned"=>$A[15],"collation"=>$A[16]),"definition"=>$A[17],"language"=>"SQL",);}function
routines(){return
get_rows("SELECT ROUTINE_NAME AS SPECIFIC_NAME, ROUTINE_NAME, ROUTINE_TYPE, DTD_IDENTIFIER FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA = ".q(DB));}function
routine_languages(){return
array();}function
routine_id($B,$J){return
idf_escape($B);}function
last_id(){global$f;return$f->result("SELECT LAST_INSERT_ID()");}function
explain($f,$G){return$f->query("EXPLAIN ".(min_version(5.1)&&!min_version(5.7)?"PARTITIONS ":"").$G);}function
found_rows($R,$Z){return($Z||$R["Engine"]!="InnoDB"?null:$R["Rows"]);}function
types(){return
array();}function
schemas(){return
array();}function
get_schema(){return"";}function
set_schema($Sg,$g=null){return
true;}function
create_sql($Q,$Ka,$Ah){global$f;$I=$f->result("SHOW CREATE TABLE ".table($Q),1);if(!$Ka)$I=preg_replace('~ AUTO_INCREMENT=\d+~','',$I);return$I;}function
truncate_sql($Q){return"TRUNCATE ".table($Q);}function
use_sql($Tb){return"USE ".idf_escape($Tb);}function
trigger_sql($Q){$I="";foreach(get_rows("SHOW TRIGGERS LIKE ".q(addcslashes($Q,"%_\\")),null,"-- ")as$J)$I.="\nCREATE TRIGGER ".idf_escape($J["Trigger"])." $J[Timing] $J[Event] ON ".table($J["Table"])." FOR EACH ROW\n$J[Statement];;\n";return$I;}function
show_variables(){return
get_key_vals("SHOW VARIABLES");}function
is_c_style_escapes(){static$Xa=null;if($Xa===null){$Pi=get_key_vals("SHOW VARIABLES LIKE 'sql_mode'");$Xa=strpos($Pi["sql_mode"],'NO_BACKSLASH_ESCAPES')===false;}return$Xa;}function
process_list(){return
get_rows("SHOW FULL PROCESSLIST");}function
show_status(){return
get_key_vals("SHOW STATUS");}function
convert_field($m){if(preg_match("~binary~",$m["type"]))return"HEX(".idf_escape($m["field"]).")";if($m["type"]=="bit")return"BIN(".idf_escape($m["field"])." + 0)";if(preg_match("~geometry|point|linestring|polygon~",$m["type"]))return(min_version(8)?"ST_":"")."AsWKT(".idf_escape($m["field"]).")";}function
unconvert_field($m,$I){if(preg_match("~binary~",$m["type"]))$I="UNHEX($I)";if($m["type"]=="bit")$I="CONVERT(b$I, UNSIGNED)";if(preg_match("~geometry|point|linestring|polygon~",$m["type"])){$dg=(min_version(8)?"ST_":"");$I=$dg."GeomFromText($I, $dg"."SRID($m[field]))";}return$I;}function
support($Wc){return!preg_match("~scheme|sequence|type|view_trigger|materializedview".(min_version(8)?"":"|descidx".(min_version(5.1)?"":"|event|partitioning".(min_version(5)?"":"|routine|trigger|view")))."~",$Wc);}function
kill_process($X){return
queries("KILL ".number($X));}function
connection_id(){return"SELECT CONNECTION_ID()";}function
max_connections(){global$f;return$f->result("SELECT @@max_connections");}function
driver_config(){$U=array();$_h=array();foreach(array('Numbers'=>array("tinyint"=>3,"smallint"=>5,"mediumint"=>8,"int"=>10,"bigint"=>20,"decimal"=>66,"float"=>12,"double"=>21),'Date and time'=>array("date"=>10,"datetime"=>19,"timestamp"=>19,"time"=>10,"year"=>4),'Strings'=>array("char"=>255,"varchar"=>65535,"tinytext"=>255,"text"=>65535,"mediumtext"=>16777215,"longtext"=>4294967295),'Lists'=>array("enum"=>65535,"set"=>64),'Binary'=>array("bit"=>20,"binary"=>255,"varbinary"=>65535,"tinyblob"=>255,"blob"=>65535,"mediumblob"=>16777215,"longblob"=>4294967295),'Geometry'=>array("geometry"=>0,"point"=>0,"linestring"=>0,"polygon"=>0,"multipoint"=>0,"multilinestring"=>0,"multipolygon"=>0,"geometrycollection"=>0),)as$x=>$X){$U+=$X;$_h[$x]=array_keys($X);}return
array('possible_drivers'=>array("MySQLi","MySQL","PDO_MySQL"),'jush'=>"sql",'types'=>$U,'structured_types'=>$_h,'unsigned'=>array("unsigned","zerofill","unsigned zerofill"),'operators'=>array("=","<",">","<=",">=","!=","LIKE","LIKE %%","REGEXP","IN","FIND_IN_SET","IS NULL","NOT LIKE","NOT REGEXP","NOT IN","IS NOT NULL","SQL"),'functions'=>array("char_length","date","from_unixtime","lower","round","floor","ceil","sec_to_time","time_to_sec","upper"),'grouping'=>array("avg","count","count distinct","group_concat","max","min","sum"),'edit_functions'=>array(array("char"=>"md5/sha1/password/encrypt/uuid","binary"=>"md5/sha1","date|time"=>"now",),array(number_type()=>"+/-","date"=>"+ interval/- interval","time"=>"addtime/subtime","char|text"=>"concat",)),);}}$yb=driver_config();$cg=$yb['possible_drivers'];$w=$yb['jush'];$U=$yb['types'];$_h=$yb['structured_types'];$Bi=$yb['unsigned'];$sf=$yb['operators'];$od=$yb['functions'];$vd=$yb['grouping'];$uc=$yb['edit_functions'];if($b->operators===null)$b->operators=$sf;define("SERVER",$_GET[DRIVER]);define("DB",$_GET["db"]);define("ME",preg_replace('~\?.*~','',relative_uri()).'?'.(sid()?SID.'&':'').(SERVER!==null?DRIVER."=".urlencode(SERVER).'&':'').(isset($_GET["username"])?"username=".urlencode($_GET["username"]).'&':'').(DB!=""?'db='.urlencode(DB).'&'.(isset($_GET["ns"])?"ns=".urlencode($_GET["ns"])."&":""):''));function
page_header($Zh,$l="",$Ua=array(),$ai=""){global$ca,$ia,$b,$mc,$w;page_headers();if(is_ajax()&&$l){page_messages($l);exit;}$bi=$Zh.($ai!=""?": $ai":"");$ci=strip_tags($bi.(SERVER!=""&&SERVER!="localhost"?h(" - ".SERVER):"")." - ".$b->name());echo'<!DOCTYPE html>
<html lang="en" dir="ltr">
<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
<meta name="robots" content="noindex">
<title>',$ci,'</title>
<link rel="stylesheet" type="text/css" href="',h(preg_replace("~\\?.*~","",ME)."?file=default.css&version=4.16.0"),'">
',script_src(preg_replace("~\\?.*~","",ME)."?file=functions.js&version=4.16.0");if($b->head()){echo'<link rel="shortcut icon" type="image/x-icon" href="',h(preg_replace("~\\?.*~","",ME)."?file=favicon.ico&version=4.16.0"),'">
<link rel="apple-touch-icon" href="',h(preg_replace("~\\?.*~","",ME)."?file=favicon.ico&version=4.16.0"),'">
';foreach($b->css()as$Ob){echo'<link rel="stylesheet" type="text/css" href="',h($Ob),'">
';}}echo'
<body class="ltr nojs">
';$o=get_temp_dir()."/adminer.version";if(!$_COOKIE["adminer_version"]&&function_exists('openssl_verify')&&file_exists($o)&&filemtime($o)+86400>time()){$Ri=unserialize(file_get_contents($o));$ng="-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAwqWOVuF5uw7/+Z70djoK
RlHIZFZPO0uYRezq90+7Amk+FDNd7KkL5eDve+vHRJBLAszF/7XKXe11xwliIsFs
DFWQlsABVZB3oisKCBEuI71J4kPH8dKGEWR9jDHFw3cWmoH3PmqImX6FISWbG3B8
h7FIx3jEaw5ckVPVTeo5JRm/1DZzJxjyDenXvBQ/6o9DgZKeNDgxwKzH+sw9/YCO
jHnq1cFpOIISzARlrHMa/43YfeNRAm/tsBXjSxembBPo7aQZLAWHmaj5+K19H10B
nCpz9Y++cipkVEiKRGih4ZEvjoFysEOdRLj6WiD/uUNky4xGeA6LaJqh5XpkFkcQ
fQIDAQAB
-----END PUBLIC KEY-----
";if(openssl_verify($Ri["version"],base64_decode($Ri["signature"]),$ng)==1)$_COOKIE["adminer_version"]=$Ri["version"];}echo'<script',nonce(),'>
mixin(document.body, {onkeydown: bodyKeydown, onclick: bodyClick',(isset($_COOKIE["adminer_version"])?"":", onload: partial(verifyVersion, '$ia', '".js_escape(ME)."', '".get_token()."')");?>});
document.body.className = document.body.className.replace(/ nojs/, ' js');
var offlineMessage = '<?php echo
js_escape('You are offline.'),'\';
var thousandsSeparator = \'',js_escape(','),'\';
</script>

<div id="help" class="jush-',$w,' jsonly hidden"></div>
',script("mixin(qs('#help'), {onmouseover: function () { helpOpen = 1; }, onmouseout: helpMouseout});"),'
<div id="content">
';if($Ua!==null){$z=substr(preg_replace('~\b(username|db|ns)=[^&]*&~','',ME),0,-1);echo'<p id="breadcrumb"><a href="'.h($z?$z:".").'">'.$mc[DRIVER].'</a> Â» ';$z=substr(preg_replace('~\b(db|ns)=[^&]*&~','',ME),0,-1);$M=$b->serverName(SERVER);$M=($M!=""?$M:'Server');if($Ua===false)echo"$M\n";else{echo"<a href='".h($z)."' accesskey='1' title='Alt+Shift+1'>$M</a> Â» ";if($_GET["ns"]!=""||(DB!=""&&is_array($Ua)))echo'<a href="'.h($z."&db=".urlencode(DB).(support("scheme")?"&ns=":"")).'">'.h(DB).'</a> Â» ';if(is_array($Ua)){if($_GET["ns"]!="")echo'<a href="'.h(substr(ME,0,-1)).'">'.h($_GET["ns"]).'</a> Â» ';foreach($Ua
as$x=>$X){$ec=(is_array($X)?$X[1]:h($X));if($ec!="")echo"<a href='".h(ME."$x=").urlencode(is_array($X)?$X[0]:$X)."'>$ec</a> Â» ";}}echo"$Zh\n";}}echo"<h2>$bi</h2>\n","<div id='ajaxstatus' class='jsonly hidden'></div>\n";restart_session();page_messages($l);$i=&get_session("dbs");if(DB!=""&&$i&&!in_array(DB,$i,true))$i=null;stop_session();define("PAGE_HEADER",1);}function
page_headers(){global$b;header("Content-Type: text/html; charset=utf-8");header("Cache-Control: no-cache");header("X-Frame-Options: deny");header("X-XSS-Protection: 0");header("X-Content-Type-Options: nosniff");header("Referrer-Policy: origin-when-cross-origin");foreach($b->csp()as$Nb){$Ad=array();foreach($Nb
as$x=>$X)$Ad[]="$x $X";header("Content-Security-Policy: ".implode("; ",$Ad));}$b->headers();}function
csp(){return
array(array("script-src"=>"'self' 'unsafe-inline' 'nonce-".get_nonce()."' 'strict-dynamic'","connect-src"=>"'self'","frame-src"=>"https://www.adminer.org","object-src"=>"'none'","base-uri"=>"'none'","form-action"=>"'self'",),);}function
get_nonce(){static$af;if(!$af)$af=base64_encode(rand_string());return$af;}function
page_messages($l){$Di=preg_replace('~^[^?]*~','',$_SERVER["REQUEST_URI"]);$Ne=$_SESSION["messages"][$Di];if($Ne){echo"<div class='message'>".implode("</div>\n<div class='message'>",$Ne)."</div>".script("messagesPrint();");unset($_SESSION["messages"][$Di]);}if($l)echo"<div class='error'>$l</div>\n";}function
page_footer($Qe=""){global$b,$gi;echo'</div>

';if($Qe!="auth"){echo'<form action="" method="post">
<p class="logout">
',h($_GET["username"])."\n",'<input type="submit" name="logout" value="Logout" id="logout">
<input type="hidden" name="token" value="',$gi,'">
</p>
</form>
';}echo'<div id="menu">
';$b->navigation($Qe);echo'</div>
',script("setupSubmitHighlight(document);");}function
int32($Te){while($Te>=2147483648)$Te-=4294967296;while($Te<=-2147483649)$Te+=4294967296;return(int)$Te;}function
long2str($W,$Vi){$Qg='';foreach($W
as$X)$Qg.=pack('V',$X);if($Vi)return
substr($Qg,0,end($W));return$Qg;}function
str2long($Qg,$Vi){$W=array_values(unpack('V*',str_pad($Qg,4*ceil(strlen($Qg)/4),"\0")));if($Vi)$W[]=strlen($Qg);return$W;}function
xxtea_mx($hj,$gj,$Dh,$ee){return
int32((($hj>>5&0x7FFFFFF)^$gj<<2)+(($gj>>3&0x1FFFFFFF)^$hj<<4))^int32(($Dh^$gj)+($ee^$hj));}function
encrypt_string($zh,$x){if($zh=="")return"";$x=array_values(unpack("V*",pack("H*",md5($x))));$W=str2long($zh,true);$Te=count($W)-1;$hj=$W[$Te];$gj=$W[0];$og=floor(6+52/($Te+1));$Dh=0;while($og-->0){$Dh=int32($Dh+0x9E3779B9);$tc=$Dh>>2&3;for($If=0;$If<$Te;$If++){$gj=$W[$If+1];$Se=xxtea_mx($hj,$gj,$Dh,$x[$If&3^$tc]);$hj=int32($W[$If]+$Se);$W[$If]=$hj;}$gj=$W[0];$Se=xxtea_mx($hj,$gj,$Dh,$x[$If&3^$tc]);$hj=int32($W[$Te]+$Se);$W[$Te]=$hj;}return
long2str($W,false);}function
decrypt_string($zh,$x){if($zh=="")return"";if(!$x)return
false;$x=array_values(unpack("V*",pack("H*",md5($x))));$W=str2long($zh,false);$Te=count($W)-1;$hj=$W[$Te];$gj=$W[0];$og=floor(6+52/($Te+1));$Dh=int32($og*0x9E3779B9);while($Dh){$tc=$Dh>>2&3;for($If=$Te;$If>0;$If--){$hj=$W[$If-1];$Se=xxtea_mx($hj,$gj,$Dh,$x[$If&3^$tc]);$gj=int32($W[$If]-$Se);$W[$If]=$gj;}$hj=$W[$Te];$Se=xxtea_mx($hj,$gj,$Dh,$x[$If&3^$tc]);$gj=int32($W[0]-$Se);$W[0]=$gj;$Dh=int32($Dh-0x9E3779B9);}return
long2str($W,true);}$f='';$_d=$_SESSION["token"];if(!$_d)$_SESSION["token"]=rand(1,1e6);$gi=get_token();$Wf=array();if($_COOKIE["adminer_permanent"]){foreach(explode(" ",$_COOKIE["adminer_permanent"])as$X){list($x)=explode(":",$X);$Wf[$x]=$X;}}function
add_invalid_login(){global$b;$q=file_open_lock(get_temp_dir()."/adminer.invalid");if(!$q)return;$Xd=unserialize(stream_get_contents($q));$Wh=time();if($Xd){foreach($Xd
as$Yd=>$X){if($X[0]<$Wh)unset($Xd[$Yd]);}}$Wd=&$Xd[$b->bruteForceKey()];if(!$Wd)$Wd=array($Wh+30*60,0);$Wd[1]++;file_write_unlock($q,serialize($Xd));}function
check_invalid_login(){global$b;$Xd=unserialize(@file_get_contents(get_temp_dir()."/adminer.invalid"));$Wd=($Xd?$Xd[$b->bruteForceKey()]:array());$Ze=($Wd[1]>29?$Wd[0]-time():0);if($Ze>0)auth_error(lang(array('Too many unsuccessful logins, try again in %d minute.','Too many unsuccessful logins, try again in %d minutes.'),ceil($Ze/60)));}$Ia=$_POST["auth"];if($Ia){session_regenerate_id();$Qi=$Ia["driver"];$M=$Ia["server"];$V=$Ia["username"];$F=(string)$Ia["password"];$j=$Ia["db"];set_password($Qi,$M,$V,$F);$_SESSION["db"][$Qi][$M][$V][$j]=true;if($Ia["permanent"]){$x=base64_encode($Qi)."-".base64_encode($M)."-".base64_encode($V)."-".base64_encode($j);$ig=$b->permanentLogin(true);$Wf[$x]="$x:".base64_encode($ig?encrypt_string($F,$ig):"");cookie("adminer_permanent",implode(" ",$Wf));}if(count($_POST)==1||DRIVER!=$Qi||SERVER!=$M||$_GET["username"]!==$V||DB!=$j)redirect(auth_url($Qi,$M,$V,$j));}elseif($_POST["logout"]&&(!$_d||verify_token())){foreach(array("pwds","db","dbs","queries")as$x)set_session($x,null);unset_permanent();redirect(substr(preg_replace('~\b(username|db|ns)=[^&]*&~','',ME),0,-1),'Logout successful.'.' '.'Thanks for using Adminer, consider <a href="https://www.adminer.org/en/donation/">donating</a>.');}elseif($Wf&&!$_SESSION["pwds"]){session_regenerate_id();$ig=$b->permanentLogin();foreach($Wf
as$x=>$X){list(,$hb)=explode(":",$X);list($Qi,$M,$V,$j)=array_map('base64_decode',explode("-",$x));set_password($Qi,$M,$V,decrypt_string(base64_decode($hb),$ig));$_SESSION["db"][$Qi][$M][$V][$j]=true;}}function
unset_permanent(){global$Wf;foreach($Wf
as$x=>$X){list($Qi,$M,$V,$j)=array_map('base64_decode',explode("-",$x));if($Qi==DRIVER&&$M==SERVER&&$V==$_GET["username"]&&$j==DB)unset($Wf[$x]);}cookie("adminer_permanent",implode(" ",$Wf));}function
auth_error($l){global$b,$_d;$gh=session_name();if(isset($_GET["username"])){header("HTTP/1.1 403 Forbidden");if(($_COOKIE[$gh]||$_GET[$gh])&&!$_d)$l='Session expired, please login again.';else{restart_session();add_invalid_login();$F=get_password();if($F!==null){if($F===false)$l.=($l?'<br>':'').sprintf('Master password expired. <a href="https://www.adminer.org/en/extension/"%s>Implement</a> %s method to make it permanent.',target_blank(),'<code>permanentLogin()</code>');set_password(DRIVER,SERVER,$_GET["username"],null);}unset_permanent();}}if(!$_COOKIE[$gh]&&$_GET[$gh]&&ini_bool("session.use_only_cookies"))$l='Session support must be enabled.';$Lf=session_get_cookie_params();cookie("adminer_key",($_COOKIE["adminer_key"]?$_COOKIE["adminer_key"]:rand_string()),$Lf["lifetime"]);page_header('Login',$l,null);echo"<form action='' method='post'>\n","<div>";if(hidden_fields($_POST,array("auth")))echo"<p class='message'>".'The action will be performed after successful login with the same credentials.'."\n";echo"</div>\n";$b->loginForm();echo"</form>\n";page_footer("auth");exit;}if(isset($_GET["username"])&&!class_exists("Min_DB")){unset($_SESSION["pwds"][DRIVER]);unset_permanent();page_header('No extension',sprintf('None of the supported PHP extensions (%s) are available.',implode(", ",$cg)),false);page_footer("auth");exit;}stop_session(true);if(isset($_GET["username"])&&is_string(get_password())){list($Ed,$Yf)=explode(":",SERVER,2);if(preg_match('~^\s*([-+]?\d+)~',$Yf,$A)&&($A[1]<1024||$A[1]>65535))auth_error('Connecting to privileged ports is not allowed.');check_invalid_login();$f=connect();$k=new
Min_Driver($f);}$we=null;if(!is_object($f)||($we=$b->login($_GET["username"],get_password()))!==true){$l=(is_string($f)?h($f):(is_string($we)?$we:'Invalid credentials.'));auth_error($l.(preg_match('~^ | $~',get_password())?'<br>'.'There is a space in the input password which might be the cause.':''));}if($_POST["logout"]&&$_d&&!verify_token()){page_header('Logout','Invalid CSRF token. Send the form again.');page_footer("db");exit;}if($Ia&&$_POST["token"])$_POST["token"]=$gi;$l='';if($_POST){if(!verify_token()){$Rd="max_input_vars";$Ge=ini_get($Rd);if(extension_loaded("suhosin")){foreach(array("suhosin.request.max_vars","suhosin.post.max_vars")as$x){$X=ini_get($x);if($X&&(!$Ge||$X<$Ge)){$Rd=$x;$Ge=$X;}}}$l=(!$_POST["token"]&&$Ge?sprintf('Maximum number of allowed fields exceeded. Please increase %s.',"'$Rd'"):'Invalid CSRF token. Send the form again.'.' '.'If you did not send this request from Adminer then close this page.');}}elseif($_SERVER["REQUEST_METHOD"]=="POST"){$l=sprintf('Too big POST data. Reduce the data or increase the %s configuration directive.',"'post_max_size'");if(isset($_GET["sql"]))$l.=' '.'You can upload a big SQL file via FTP and import it from server.';}function
select($H,$g=null,$zf=array(),$y=0){global$w;$ve=array();$v=array();$e=array();$Sa=array();$U=array();$I=array();odd('');for($s=0;(!$y||$s<$y)&&($J=$H->fetch_row());$s++){if(!$s){echo"<div class='scrollable'>\n","<table cellspacing='0' class='nowrap'>\n","<thead><tr>";for($de=0;$de<count($J);$de++){$m=$H->fetch_field();$B=$m->name;$yf=$m->orgtable;$xf=$m->orgname;$I[$m->table]=$yf;if($zf&&$w=="sql")$ve[$de]=($B=="table"?"table=":($B=="possible_keys"?"indexes=":null));elseif($yf!=""){if(!isset($v[$yf])){$v[$yf]=array();foreach(indexes($yf,$g)as$u){if($u["type"]=="PRIMARY"){$v[$yf]=array_flip($u["columns"]);break;}}$e[$yf]=$v[$yf];}if(isset($e[$yf][$xf])){unset($e[$yf][$xf]);$v[$yf][$xf]=$de;$ve[$de]=$yf;}}if($m->charsetnr==63)$Sa[$de]=true;$U[$de]=$m->type;echo"<th".($yf!=""||$m->name!=$xf?" title='".h(($yf!=""?"$yf.":"").$xf)."'":"").">".h($B).($zf?doc_link(array('sql'=>"explain-output.html#explain_".strtolower($B),'mariadb'=>"explain/#the-columns-in-explain-select",)):"");}echo"</thead>\n";}echo"<tr".odd().">";foreach($J
as$x=>$X){$z="";if(isset($ve[$x])&&!$e[$ve[$x]]){if($zf&&$w=="sql"){$Q=$J[array_search("table=",$ve)];$z=ME.$ve[$x].urlencode($zf[$Q]!=""?$zf[$Q]:$Q);}else{$z=ME."edit=".urlencode($ve[$x]);foreach($v[$ve[$x]]as$lb=>$de)$z.="&where".urlencode("[".bracket_escape($lb)."]")."=".urlencode($J[$de]);}}elseif(is_url($X))$z=$X;if($X===null)$X="<i>NULL</i>";elseif($Sa[$x]&&!is_utf8($X))$X="<i>".lang(array('%d byte','%d bytes'),strlen($X))."</i>";else{$X=h($X);if($U[$x]==254)$X="<code>$X</code>";}if($z)$X="<a href='".h($z)."'".(is_url($z)?target_blank():'').">$X</a>";echo"<td>$X";}}echo($s?"</table>\n</div>":"<p class='message'>".'No rows.')."\n";return$I;}function
referencable_primary($Yg){$I=array();foreach(table_status('',true)as$Hh=>$Q){if($Hh!=$Yg&&fk_support($Q)){foreach(fields($Hh)as$m){if($m["primary"]){if($I[$Hh]){unset($I[$Hh]);break;}$I[$Hh]=$m;}}}}return$I;}function
adminer_settings(){parse_str($_COOKIE["adminer_settings"],$ih);return$ih;}function
adminer_setting($x){$ih=adminer_settings();return$ih[$x];}function
set_adminer_settings($ih){return
cookie("adminer_settings",http_build_query($ih+adminer_settings()));}function
textarea($B,$Y,$K=10,$qb=80){global$w;echo"<textarea name='".h($B)."' rows='$K' cols='$qb' class='sqlarea jush-$w' spellcheck='false' wrap='off'>";if(is_array($Y)){foreach($Y
as$X)echo
h($X[0])."\n\n\n";}else
echo
h($Y);echo"</textarea>";}function
select_input($Ha,$D,$Y="",$of="",$Xf=""){$Oh=($D?"select":"input");return"<$Oh$Ha".($D?"><option value=''>$Xf".optionlist($D,$Y,true)."</select>":" size='10' value='".h($Y)."' placeholder='$Xf'>").($of?script("qsl('$Oh').onchange = $of;",""):"");}function
json_row($x,$X=null){static$bd=true;if($bd)echo"{";if($x!=""){echo($bd?"":",")."\n\t\"".addcslashes($x,"\r\n\t\"\\/").'": '.($X!==null?'"'.addcslashes($X,"\r\n\"\\/").'"':'null');$bd=false;}else{echo"\n}\n";$bd=true;}}function
edit_type($x,$m,$ob,$jd=array(),$Tc=array()){global$_h,$U,$Bi,$nf;$T=$m["type"];echo'<td><select name="',h($x),'[type]" class="type" aria-labelledby="label-type">';if($T&&!isset($U[$T])&&!isset($jd[$T])&&!in_array($T,$Tc))$Tc[]=$T;if($jd)$_h['Foreign keys']=$jd;echo
optionlist(array_merge($Tc,$_h),$T),'</select><td><input name="',h($x),'[length]" value="',h($m["length"]),'" size="3"',(!$m["length"]&&preg_match('~var(char|binary)$~',$T)?" class='required'":"");echo' aria-labelledby="label-length"><td class="options">',"<select name='".h($x)."[collation]'".(preg_match('~(char|text|enum|set)$~',$T)?"":" class='hidden'").'><option value="">('.'collation'.')'.optionlist($ob,$m["collation"]).'</select>',($Bi?"<select name='".h($x)."[unsigned]'".(!$T||preg_match(number_type(),$T)?"":" class='hidden'").'><option>'.optionlist($Bi,$m["unsigned"]).'</select>':''),(isset($m['on_update'])?"<select name='".h($x)."[on_update]'".(preg_match('~timestamp|datetime~',$T)?"":" class='hidden'").'>'.optionlist(array(""=>"(".'ON UPDATE'.")","CURRENT_TIMESTAMP"),(preg_match('~^CURRENT_TIMESTAMP~i',$m["on_update"])?"CURRENT_TIMESTAMP":$m["on_update"])).'</select>':''),($jd?"<select name='".h($x)."[on_delete]'".(preg_match("~`~",$T)?"":" class='hidden'")."><option value=''>(".'ON DELETE'.")".optionlist(explode("|",$nf),$m["on_delete"])."</select> ":" ");}function
get_partitions_info($Q){global$f;$nd="FROM information_schema.PARTITIONS WHERE TABLE_SCHEMA = ".q(DB)." AND TABLE_NAME = ".q($Q);$H=$f->query("SELECT PARTITION_METHOD, PARTITION_EXPRESSION, PARTITION_ORDINAL_POSITION $nd ORDER BY PARTITION_ORDINAL_POSITION DESC LIMIT 1");$I=array();list($I["partition_by"],$I["partition"],$I["partitions"])=$H->fetch_row();$Rf=get_key_vals("SELECT PARTITION_NAME, PARTITION_DESCRIPTION $nd AND PARTITION_NAME != '' ORDER BY PARTITION_ORDINAL_POSITION");$I["partition_names"]=array_keys($Rf);$I["partition_values"]=array_values($Rf);return$I;}function
process_length($se){global$Dc;return(preg_match("~^\\s*\\(?\\s*$Dc(?:\\s*,\\s*$Dc)*+\\s*\\)?\\s*\$~",$se)&&preg_match_all("~$Dc~",$se,$Ae)?"(".implode(",",$Ae[0]).")":preg_replace('~^[0-9].*~','(\0)',preg_replace('~[^-0-9,+()[\]]~','',$se)));}function
process_type($m,$mb="COLLATE"){global$Bi;return" $m[type]".process_length($m["length"]).(preg_match(number_type(),$m["type"])&&in_array($m["unsigned"],$Bi)?" $m[unsigned]":"").(preg_match('~char|text|enum|set~',$m["type"])&&$m["collation"]?" $mb ".q($m["collation"]):"");}function
process_field($m,$ti){if($m["on_update"])$m["on_update"]=str_ireplace("current_timestamp()","CURRENT_TIMESTAMP",$m["on_update"]);return
array(idf_escape(trim($m["field"])),process_type($ti),($m["null"]?" NULL":" NOT NULL"),default_value($m),(preg_match('~timestamp|datetime~',$m["type"])&&$m["on_update"]?" ON UPDATE $m[on_update]":""),(support("comment")&&$m["comment"]!=""?" COMMENT ".q($m["comment"]):""),($m["auto_increment"]?auto_increment():null),);}function
default_value($m){global$w;$Zb=$m["default"];return($Zb===null?"":" DEFAULT ".(!preg_match('~^GENERATED ~i',$Zb)&&(preg_match('~char|binary|text|enum|set~',$m["type"])||preg_match('~^(?![a-z])~i',$Zb))?q($Zb):str_ireplace("current_timestamp()","CURRENT_TIMESTAMP",($w=="sqlite"?"($Zb)":$Zb))));}function
type_class($T){foreach(array('char'=>'text','date'=>'time|year','binary'=>'blob','enum'=>'set',)as$x=>$X){if(preg_match("~$x|$X~",$T))return" class='$x'";}}function
edit_fields($n,$ob,$T="TABLE",$jd=array()){global$Sd;$n=array_values($n);$ac=(($_POST?$_POST["defaults"]:adminer_setting("defaults"))?"":" class='hidden'");$vb=(($_POST?$_POST["comments"]:adminer_setting("comments"))?"":" class='hidden'");echo'<thead><tr>
';if($T=="PROCEDURE"){echo'<td>';}echo'<th id="label-name">',($T=="TABLE"?'Column name':'Parameter name'),'<td id="label-type">Type<textarea id="enum-edit" rows="4" cols="12" wrap="off" style="display: none;"></textarea>',script("qs('#enum-edit').onblur = editingLengthBlur;"),'<td id="label-length">Length
<td>','Options';if($T=="TABLE"){echo'<td id="label-null">NULL
<td><input type="radio" name="auto_increment_col" value=""><abbr id="label-ai" title="Auto Increment">AI</abbr>',doc_link(array('sql'=>"example-auto-increment.html",'mariadb'=>"auto_increment/",'sqlite'=>"autoinc.html",'pgsql'=>"datatype-numeric.html#DATATYPE-SERIAL",'mssql'=>"ms186775.aspx",)),'<td id="label-default"',$ac,'>Default value
',(support("comment")?"<td id='label-comment'$vb>".'Comment':"");}echo'<td>',"<input type='image' class='icon' name='add[".(support("move_col")?0:count($n))."]' src='".h(preg_replace("~\\?.*~","",ME)."?file=plus.gif&version=4.16.0")."' alt='+' title='".'Add next'."'>".script("row_count = ".count($n).";"),'</thead>
<tbody>
',script("mixin(qsl('tbody'), {onclick: editingClick, onkeydown: editingKeydown, oninput: editingInput});");foreach($n
as$s=>$m){$s++;$_f=$m[($_POST?"orig":"field")];$jc=(isset($_POST["add"][$s-1])||(isset($m["field"])&&!$_POST["drop_col"][$s]))&&(support("drop_col")||$_f=="");echo'<tr',($jc?"":" style='display: none;'"),'>
',($T=="PROCEDURE"?"<td>".html_select("fields[$s][inout]",explode("|",$Sd),$m["inout"]):""),'<th>';if($jc){echo'<input name="fields[',$s,'][field]" value="',h($m["field"]),'" data-maxlength="64" autocapitalize="off" aria-labelledby="label-name">';}echo'<input type="hidden" name="fields[',$s,'][orig]" value="',h($_f),'">';edit_type("fields[$s]",$m,$ob,$jd);if($T=="TABLE"){echo'<td>',checkbox("fields[$s][null]",1,$m["null"],"","","block","label-null"),'<td><label class="block"><input type="radio" name="auto_increment_col" value="',$s,'"';if($m["auto_increment"]){echo' checked';}echo' aria-labelledby="label-ai"></label><td',$ac,'>',checkbox("fields[$s][has_default]",1,$m["has_default"],"","","","label-default"),'<input name="fields[',$s,'][default]" value="',h($m["default"]),'" aria-labelledby="label-default">',(support("comment")?"<td$vb><input name='fields[$s][comment]' value='".h($m["comment"])."' data-maxlength='".(min_version(5.5)?1024:255)."' aria-labelledby='label-comment'>":"");}echo"<td>",(support("move_col")?"<input type='image' class='icon' name='add[$s]' src='".h(preg_replace("~\\?.*~","",ME)."?file=plus.gif&version=4.16.0")."' alt='+' title='".'Add next'."'> "."<input type='image' class='icon' name='up[$s]' src='".h(preg_replace("~\\?.*~","",ME)."?file=up.gif&version=4.16.0")."' alt='â†‘' title='".'Move up'."'> "."<input type='image' class='icon' name='down[$s]' src='".h(preg_replace("~\\?.*~","",ME)."?file=down.gif&version=4.16.0")."' alt='â†“' title='".'Move down'."'> ":""),($_f==""||support("drop_col")?"<input type='image' class='icon' name='drop_col[$s]' src='".h(preg_replace("~\\?.*~","",ME)."?file=cross.gif&version=4.16.0")."' alt='x' title='".'Remove'."'>":"");}}function
process_fields(&$n){$C=0;if($_POST["up"]){$me=0;foreach($n
as$x=>$m){if(key($_POST["up"])==$x){unset($n[$x]);array_splice($n,$me,0,array($m));break;}if(isset($m["field"]))$me=$C;$C++;}}elseif($_POST["down"]){$ld=false;foreach($n
as$x=>$m){if(isset($m["field"])&&$ld){unset($n[key($_POST["down"])]);array_splice($n,$C,0,array($ld));break;}if(key($_POST["down"])==$x)$ld=$m;$C++;}}elseif($_POST["add"]){$n=array_values($n);array_splice($n,key($_POST["add"]),0,array(array()));}elseif(!$_POST["drop_col"])return
false;return
true;}function
normalize_enum($A){return"'".str_replace("'","''",addcslashes(stripcslashes(str_replace($A[0][0].$A[0][0],$A[0][0],substr($A[0],1,-1))),'\\'))."'";}function
grant($qd,$kg,$e,$mf){if(!$kg)return
true;if($kg==array("ALL PRIVILEGES","GRANT OPTION"))return($qd=="GRANT"?queries("$qd ALL PRIVILEGES$mf WITH GRANT OPTION"):queries("$qd ALL PRIVILEGES$mf")&&queries("$qd GRANT OPTION$mf"));return
queries("$qd ".preg_replace('~(GRANT OPTION)\([^)]*\)~','\1',implode("$e, ",$kg).$e).$mf);}function
drop_create($nc,$h,$oc,$Sh,$qc,$_,$Me,$Ke,$Le,$jf,$Xe){if($_POST["drop"])query_redirect($nc,$_,$Me);elseif($jf=="")query_redirect($h,$_,$Le);elseif($jf!=$Xe){$Lb=queries($h);queries_redirect($_,$Ke,$Lb&&queries($nc));if($Lb)queries($oc);}else
queries_redirect($_,$Ke,queries($Sh)&&queries($qc)&&queries($nc)&&queries($h));}function
create_trigger($mf,$J){global$w;$Yh=" $J[Timing] $J[Event]".(preg_match('~ OF~',$J["Event"])?" $J[Of]":"");return"CREATE TRIGGER ".idf_escape($J["Trigger"]).($w=="mssql"?$mf.$Yh:$Yh.$mf).rtrim(" $J[Type]\n$J[Statement]",";").";";}function
create_routine($Mg,$J){global$Sd,$w;$N=array();$n=(array)$J["fields"];ksort($n);foreach($n
as$m){if($m["field"]!="")$N[]=(preg_match("~^($Sd)\$~",$m["inout"])?"$m[inout] ":"").idf_escape($m["field"]).process_type($m,"CHARACTER SET");}$bc=rtrim("\n$J[definition]",";");return"CREATE $Mg ".idf_escape(trim($J["name"]))." (".implode(", ",$N).")".(isset($_GET["function"])?" RETURNS".process_type($J["returns"],"CHARACTER SET"):"").($J["language"]?" LANGUAGE $J[language]":"").($w=="pgsql"?" AS ".q($bc):"$bc;");}function
remove_definer($G){return
preg_replace('~^([A-Z =]+) DEFINER=`'.preg_replace('~@(.*)~','`@`(%|\1)',logged_user()).'`~','\1',$G);}function
format_foreign_key($p){global$nf;$j=$p["db"];$bf=$p["ns"];return" FOREIGN KEY (".implode(", ",array_map('idf_escape',$p["source"])).") REFERENCES ".($j!=""&&$j!=$_GET["db"]?idf_escape($j).".":"").($bf!=""&&$bf!=$_GET["ns"]?idf_escape($bf).".":"").table($p["table"])." (".implode(", ",array_map('idf_escape',$p["target"])).")".(preg_match("~^($nf)\$~",$p["on_delete"])?" ON DELETE $p[on_delete]":"").(preg_match("~^($nf)\$~",$p["on_update"])?" ON UPDATE $p[on_update]":"");}function
tar_file($o,$di){$I=pack("a100a8a8a8a12a12",$o,644,0,0,decoct($di->size),decoct(time()));$gb=8*32;for($s=0;$s<strlen($I);$s++)$gb+=ord($I[$s]);$I.=sprintf("%06o",$gb)."\0 ";echo$I,str_repeat("\0",512-strlen($I));$di->send();echo
str_repeat("\0",511-($di->size+511)%512);}function
ini_bytes($Rd){$X=ini_get($Rd);switch(strtolower(substr($X,-1))){case'g':$X=(int)$X*1024;case'm':$X=(int)$X*1024;case'k':$X=(int)$X*1024;}return$X;}function
doc_link($Tf,$Th="<sup>?</sup>"){global$w,$f;$eh=$f->server_info;$Ri=preg_replace('~^(\d\.?\d).*~s','\1',$eh);$Fi=array('sql'=>"https://dev.mysql.com/doc/refman/$Ri/en/",'sqlite'=>"https://www.sqlite.org/",'pgsql'=>"https://www.postgresql.org/docs/$Ri/",'mssql'=>"https://msdn.microsoft.com/library/",'oracle'=>"https://www.oracle.com/pls/topic/lookup?ctx=db".preg_replace('~^.* (\d+)\.(\d+)\.\d+\.\d+\.\d+.*~s','\1\2',$eh)."&id=",);if(preg_match('~MariaDB~',$eh)){$Fi['sql']="https://mariadb.com/kb/en/";$Tf['sql']=(isset($Tf['mariadb'])?$Tf['mariadb']:str_replace(".html","/",$Tf['sql']));}return($Tf[$w]?"<a href='".h($Fi[$w].$Tf[$w])."'".target_blank().">$Th</a>":"");}function
ob_gzencode($P){return
gzencode($P);}function
db_size($j){global$f;if(!$f->select_db($j))return"?";$I=0;foreach(table_status()as$R)$I+=$R["Data_length"]+$R["Index_length"];return
format_number($I);}function
set_utf8mb4($h){global$f;static$N=false;if(!$N&&preg_match('~\butf8mb4~i',$h)){$N=true;echo"SET NAMES ".charset($f).";\n\n";}}function
connect_error(){global$b,$f,$gi,$l,$mc;if(DB!=""){header("HTTP/1.1 404 Not Found");page_header('Database'.": ".h(DB),'Invalid database.',true);}else{if($_POST["db"]&&!$l)queries_redirect(substr(ME,0,-1),'Databases have been dropped.',drop_databases($_POST["db"]));page_header('Select database',$l,false);echo"<p class='links'>\n";foreach(array('database'=>'Create database','privileges'=>'Privileges','processlist'=>'Process list','variables'=>'Variables','status'=>'Status',)as$x=>$X){if(support($x))echo"<a href='".h(ME)."$x='>$X</a>\n";}echo"<p>".sprintf('%s version: %s through PHP extension %s',$mc[DRIVER],"<b>".h($f->server_info)."</b>","<b>$f->extension</b>")."\n","<p>".sprintf('Logged as: %s',"<b>".h(logged_user())."</b>")."\n";$i=$b->databases();if($i){$Tg=support("scheme");$ob=collations();echo"<form action='' method='post'>\n","<table cellspacing='0' class='checkable'>\n",script("mixin(qsl('table'), {onclick: tableClick, ondblclick: partialArg(tableClick, true)});"),"<thead><tr>".(support("database")?"<td>":"")."<th>".'Database'." - <a href='".h(ME)."refresh=1'>".'Refresh'."</a>"."<td>".'Collation'."<td>".'Tables'."<td>".'Size'." - <a href='".h(ME)."dbsize=1'>".'Compute'."</a>".script("qsl('a').onclick = partial(ajaxSetHtml, '".js_escape(ME)."script=connect');","")."</thead>\n";$i=($_GET["dbsize"]?count_tables($i):array_flip($i));foreach($i
as$j=>$S){$Lg=h(ME)."db=".urlencode($j);$Gd=h("Db-".$j);echo"<tr".odd().">".(support("database")?"<td>".checkbox("db[]",$j,in_array($j,(array)$_POST["db"]),"","","",$Gd):""),"<th><a href='$Lg' id='$Gd'>".h($j)."</a>";$nb=h(db_collation($j,$ob));echo"<td>".(support("database")?"<a href='$Lg".($Tg?"&amp;ns=":"")."&amp;database=' title='".'Alter database'."'>$nb</a>":$nb),"<td align='right'><a href='$Lg&amp;schema=' id='tables-".h($j)."' title='".'Database schema'."'>".($_GET["dbsize"]?$S:"?")."</a>","<td align='right' id='size-".h($j)."'>".($_GET["dbsize"]?db_size($j):"?"),"\n";}echo"</table>\n",(support("database")?"<div class='footer'><div>\n"."<fieldset><legend>".'Selected'." <span id='selected'></span></legend><div>\n"."<input type='hidden' name='all' value=''>".script("qsl('input').onclick = function () { selectCount('selected', formChecked(this, /^db/)); };")."<input type='submit' name='drop' value='".'Drop'."'>".confirm()."\n"."</div></fieldset>\n"."</div></div>\n":""),"<input type='hidden' name='token' value='$gi'>\n","</form>\n",script("tableCheck();");}}page_footer("db");}if(isset($_GET["status"]))$_GET["variables"]=$_GET["status"];if(isset($_GET["import"]))$_GET["sql"]=$_GET["import"];if(!(DB!=""?$f->select_db(DB):isset($_GET["sql"])||isset($_GET["dump"])||isset($_GET["database"])||isset($_GET["processlist"])||isset($_GET["privileges"])||isset($_GET["user"])||isset($_GET["variables"])||$_GET["script"]=="connect"||$_GET["script"]=="kill")){if(DB!=""||$_GET["refresh"]){restart_session();set_session("dbs",null);}connect_error();exit;}if(support("scheme")){if(DB!=""&&$_GET["ns"]!==""){if(!isset($_GET["ns"]))redirect(preg_replace('~ns=[^&]*&~','',ME)."ns=".get_schema());if(!set_schema($_GET["ns"])){header("HTTP/1.1 404 Not Found");page_header('Schema'.": ".h($_GET["ns"]),'Invalid schema.',true);page_footer("ns");exit;}}}$nf="RESTRICT|NO ACTION|CASCADE|SET NULL|SET DEFAULT";class
TmpFile{var$handler;var$size;function
__construct(){$this->handler=tmpfile();}function
write($Eb){$this->size+=strlen($Eb);fwrite($this->handler,$Eb);}function
send(){fseek($this->handler,0);fpassthru($this->handler);fclose($this->handler);}}$Dc="'(?:''|[^'\\\\]|\\\\.)*'";$Sd="IN|OUT|INOUT";if(isset($_GET["select"])&&($_POST["edit"]||$_POST["clone"])&&!$_POST["save"])$_GET["edit"]=$_GET["select"];if(isset($_GET["callf"]))$_GET["call"]=$_GET["callf"];if(isset($_GET["function"]))$_GET["procedure"]=$_GET["function"];if(isset($_GET["download"])){$a=$_GET["download"];$n=fields($a);header("Content-Type: application/octet-stream");header("Content-Disposition: attachment; filename=".friendly_url("$a-".implode("_",$_GET["where"])).".".friendly_url($_GET["field"]));$L=array(idf_escape($_GET["field"]));$H=$k->select($a,$L,array(where($_GET,$n)),$L);$J=($H?$H->fetch_row():array());echo$k->value($J[0],$n[$_GET["field"]]);exit;}elseif(isset($_GET["table"])){$a=$_GET["table"];$n=fields($a);if(!$n)$l=error();$R=table_status1($a,true);$B=$b->tableName($R);page_header(($n&&is_view($R)?$R['Engine']=='materialized view'?'Materialized view':'View':'Table').": ".($B!=""?$B:h($a)),$l);$Kg=array();foreach($n
as$x=>$m)$Kg+=$m["privileges"];$b->selectLinks($R,(isset($Kg["insert"])||!support("table")?"":null));$ub=$R["Comment"];if($ub!="")echo"<p class='nowrap'>".'Comment'.": ".h($ub)."\n";if($n)$b->tableStructurePrint($n);if(!is_view($R)){if(support("indexes")){echo"<h3 id='indexes'>".'Indexes'."</h3>\n";$v=indexes($a);if($v)$b->tableIndexesPrint($v);echo'<p class="links"><a href="'.h(ME).'indexes='.urlencode($a).'">'.'Alter indexes'."</a>\n";}if(fk_support($R)){echo"<h3 id='foreign-keys'>".'Foreign keys'."</h3>\n";$jd=foreign_keys($a);if($jd){echo"<table cellspacing='0'>\n","<thead><tr><th>".'Source'."<td>".'Target'."<td>".'ON DELETE'."<td>".'ON UPDATE'."<td></thead>\n";foreach($jd
as$B=>$p){echo"<tr title='".h($B)."'>","<th><i>".implode("</i>, <i>",array_map('h',$p["source"]))."</i>","<td><a href='".h($p["db"]!=""?preg_replace('~db=[^&]*~',"db=".urlencode($p["db"]),ME):($p["ns"]!=""?preg_replace('~ns=[^&]*~',"ns=".urlencode($p["ns"]),ME):ME))."table=".urlencode($p["table"])."'>".($p["db"]!=""?"<b>".h($p["db"])."</b>.":"").($p["ns"]!=""?"<b>".h($p["ns"])."</b>.":"").h($p["table"])."</a>","(<i>".implode("</i>, <i>",array_map('h',$p["target"]))."</i>)","<td>".h($p["on_delete"])."\n","<td>".h($p["on_update"])."\n",'<td><a href="'.h(ME.'foreign='.urlencode($a).'&name='.urlencode($B)).'">'.'Alter'.'</a>';}echo"</table>\n";}echo'<p class="links"><a href="'.h(ME).'foreign='.urlencode($a).'">'.'Add foreign key'."</a>\n";}}if(support(is_view($R)?"view_trigger":"trigger")){echo"<h3 id='triggers'>".'Triggers'."</h3>\n";$si=triggers($a);if($si){echo"<table cellspacing='0'>\n";foreach($si
as$x=>$X)echo"<tr valign='top'><td>".h($X[0])."<td>".h($X[1])."<th>".h($x)."<td><a href='".h(ME.'trigger='.urlencode($a).'&name='.urlencode($x))."'>".'Alter'."</a>\n";echo"</table>\n";}echo'<p class="links"><a href="'.h(ME).'trigger='.urlencode($a).'">'.'Add trigger'."</a>\n";}}elseif(isset($_GET["schema"])){page_header('Database schema',"",array(),h(DB.($_GET["ns"]?".$_GET[ns]":"")));$Jh=array();$Kh=array();$ea=($_GET["schema"]?$_GET["schema"]:$_COOKIE["adminer_schema-".str_replace(".","_",DB)]);preg_match_all('~([^:]+):([-0-9.]+)x([-0-9.]+)(_|$)~',$ea,$Ae,PREG_SET_ORDER);foreach($Ae
as$s=>$A){$Jh[$A[1]]=array($A[2],$A[3]);$Kh[]="\n\t'".js_escape($A[1])."': [ $A[2], $A[3] ]";}$hi=0;$Pa=-1;$Sg=array();$yg=array();$qe=array();foreach(table_status('',true)as$Q=>$R){if(is_view($R))continue;$Zf=0;$Sg[$Q]["fields"]=array();foreach(fields($Q)as$B=>$m){$Zf+=1.25;$m["pos"]=$Zf;$Sg[$Q]["fields"][$B]=$m;}$Sg[$Q]["pos"]=($Jh[$Q]?$Jh[$Q]:array($hi,0));foreach($b->foreignKeys($Q)as$X){if(!$X["db"]){$oe=$Pa;if($Jh[$Q][1]||$Jh[$X["table"]][1])$oe=min(floatval($Jh[$Q][1]),floatval($Jh[$X["table"]][1]))-1;else$Pa-=.1;while($qe[(string)$oe])$oe-=.0001;$Sg[$Q]["references"][$X["table"]][(string)$oe]=array($X["source"],$X["target"]);$yg[$X["table"]][$Q][(string)$oe]=$X["target"];$qe[(string)$oe]=true;}}$hi=max($hi,$Sg[$Q]["pos"][0]+2.5+$Zf);}echo'<div id="schema" style="height: ',$hi,'em;">
<script',nonce(),'>
qs(\'#schema\').onselectstart = function () { return false; };
var tablePos = {',implode(",",$Kh)."\n",'};
var em = qs(\'#schema\').offsetHeight / ',$hi,';
document.onmousemove = schemaMousemove;
document.onmouseup = partialArg(schemaMouseup, \'',js_escape(DB),'\');
</script>
';foreach($Sg
as$B=>$Q){echo"<div class='table' style='top: ".$Q["pos"][0]."em; left: ".$Q["pos"][1]."em;'>",'<a href="'.h(ME).'table='.urlencode($B).'"><b>'.h($B)."</b></a>",script("qsl('div').onmousedown = schemaMousedown;");foreach($Q["fields"]as$m){$X='<span'.type_class($m["type"]).' title="'.h($m["full_type"].($m["null"]?" NULL":'')).'">'.h($m["field"]).'</span>';echo"<br>".($m["primary"]?"<i>$X</i>":$X);}foreach((array)$Q["references"]as$Qh=>$zg){foreach($zg
as$oe=>$vg){$pe=$oe-$Jh[$B][1];$s=0;foreach($vg[0]as$ph)echo"\n<div class='references' title='".h($Qh)."' id='refs$oe-".($s++)."' style='left: $pe"."em; top: ".$Q["fields"][$ph]["pos"]."em; padding-top: .5em;'><div style='border-top: 1px solid Gray; width: ".(-$pe)."em;'></div></div>";}}foreach((array)$yg[$B]as$Qh=>$zg){foreach($zg
as$oe=>$e){$pe=$oe-$Jh[$B][1];$s=0;foreach($e
as$Ph)echo"\n<div class='references' title='".h($Qh)."' id='refd$oe-".($s++)."' style='left: $pe"."em; top: ".$Q["fields"][$Ph]["pos"]."em; height: 1.25em; background: url(".h(preg_replace("~\\?.*~","",ME)."?file=arrow.gif) no-repeat right center;&version=4.16.0")."'><div style='height: .5em; border-bottom: 1px solid Gray; width: ".(-$pe)."em;'></div></div>";}}echo"\n</div>\n";}foreach($Sg
as$B=>$Q){foreach((array)$Q["references"]as$Qh=>$zg){foreach($zg
as$oe=>$vg){$Pe=$hi;$Ee=-10;foreach($vg[0]as$x=>$ph){$ag=$Q["pos"][0]+$Q["fields"][$ph]["pos"];$bg=$Sg[$Qh]["pos"][0]+$Sg[$Qh]["fields"][$vg[1][$x]]["pos"];$Pe=min($Pe,$ag,$bg);$Ee=max($Ee,$ag,$bg);}echo"<div class='references' id='refl$oe' style='left: $oe"."em; top: $Pe"."em; padding: .5em 0;'><div style='border-right: 1px solid Gray; margin-top: 1px; height: ".($Ee-$Pe)."em;'></div></div>\n";}}}echo'</div>
<p class="links"><a href="',h(ME."schema=".urlencode($ea)),'" id="schema-link">Permanent link</a>
';}elseif(isset($_GET["dump"])){$a=$_GET["dump"];if($_POST&&!$l){$Hb="";foreach(array("output","format","db_style","routines","events","table_style","auto_increment","triggers","data_style")as$x)$Hb.="&$x=".urlencode($_POST[$x]);cookie("adminer_export",substr($Hb,1));$S=array_flip((array)$_POST["tables"])+array_flip((array)$_POST["data"]);$Qc=dump_headers((count($S)==1?key($S):DB),(DB==""||count($S)>1));$ae=preg_match('~sql~',$_POST["format"]);if($ae){echo"-- Adminer $ia ".$mc[DRIVER]." ".str_replace("\n"," ",$f->server_info)." dump\n\n";if($w=="sql"){echo"SET NAMES utf8;
SET time_zone = '+00:00';
SET foreign_key_checks = 0;
".($_POST["data_style"]?"SET sql_mode = 'NO_AUTO_VALUE_ON_ZERO';
":"")."
";$f->query("SET time_zone = '+00:00'");$f->query("SET sql_mode = ''");}}$Ah=$_POST["db_style"];$i=array(DB);if(DB==""){$i=$_POST["databases"];if(is_string($i))$i=explode("\n",rtrim(str_replace("\r","",$i),"\n"));}foreach((array)$i
as$j){$b->dumpDatabase($j);if($f->select_db($j)){if($ae&&preg_match('~CREATE~',$Ah)&&($h=$f->result("SHOW CREATE DATABASE ".idf_escape($j),1))){set_utf8mb4($h);if($Ah=="DROP+CREATE")echo"DROP DATABASE IF EXISTS ".idf_escape($j).";\n";echo"$h;\n";}if($ae){if($Ah)echo
use_sql($j).";\n\n";$Ff="";if($_POST["routines"]){foreach(array("FUNCTION","PROCEDURE")as$Mg){foreach(get_rows("SHOW $Mg STATUS WHERE Db = ".q($j),null,"-- ")as$J){$h=remove_definer($f->result("SHOW CREATE $Mg ".idf_escape($J["Name"]),2));set_utf8mb4($h);$Ff.=($Ah!='DROP+CREATE'?"DROP $Mg IF EXISTS ".idf_escape($J["Name"]).";;\n":"")."$h;;\n\n";}}}if($_POST["events"]){foreach(get_rows("SHOW EVENTS",null,"-- ")as$J){$h=remove_definer($f->result("SHOW CREATE EVENT ".idf_escape($J["Name"]),3));set_utf8mb4($h);$Ff.=($Ah!='DROP+CREATE'?"DROP EVENT IF EXISTS ".idf_escape($J["Name"]).";;\n":"")."$h;;\n\n";}}if($Ff)echo"DELIMITER ;;\n\n$Ff"."DELIMITER ;\n\n";}if($_POST["table_style"]||$_POST["data_style"]){$Ti=array();foreach(table_status('',true)as$B=>$R){$Q=(DB==""||in_array($B,(array)$_POST["tables"]));$Rb=(DB==""||in_array($B,(array)$_POST["data"]));if($Q||$Rb){if($Qc=="tar"){$di=new
TmpFile;ob_start(array($di,'write'),1e5);}$b->dumpTable($B,($Q?$_POST["table_style"]:""),(is_view($R)?2:0));if(is_view($R))$Ti[]=$B;elseif($Rb){$n=fields($B);$b->dumpData($B,$_POST["data_style"],"SELECT *".convert_fields($n,$n)." FROM ".table($B));}if($ae&&$_POST["triggers"]&&$Q&&($si=trigger_sql($B)))echo"\nDELIMITER ;;\n$si\nDELIMITER ;\n";if($Qc=="tar"){ob_end_flush();tar_file((DB!=""?"":"$j/")."$B.csv",$di);}elseif($ae)echo"\n";}}if(function_exists('foreign_keys_sql')){foreach(table_status('',true)as$B=>$R){$Q=(DB==""||in_array($B,(array)$_POST["tables"]));if($Q&&!is_view($R))echo
foreign_keys_sql($B);}}foreach($Ti
as$Si)$b->dumpTable($Si,$_POST["table_style"],1);if($Qc=="tar")echo
pack("x512");}}}if($ae)echo"-- ".$f->result("SELECT NOW()")."\n";exit;}page_header('Export',$l,($_GET["export"]!=""?array("table"=>$_GET["export"]):array()),h(DB));echo'
<form action="" method="post">
<table cellspacing="0" class="layout">
';$Wb=array('','USE','DROP+CREATE','CREATE');$Lh=array('','DROP+CREATE','CREATE');$Sb=array('','TRUNCATE+INSERT','INSERT');if($w=="sql")$Sb[]='INSERT+UPDATE';parse_str($_COOKIE["adminer_export"],$J);if(!$J)$J=array("output"=>"text","format"=>"sql","db_style"=>(DB!=""?"":"CREATE"),"table_style"=>"DROP+CREATE","data_style"=>"INSERT");if(!isset($J["events"])){$J["routines"]=$J["events"]=($_GET["dump"]=="");$J["triggers"]=$J["table_style"];}echo"<tr><th>".'Output'."<td>".html_select("output",$b->dumpOutput(),$J["output"],0)."\n";echo"<tr><th>".'Format'."<td>".html_select("format",$b->dumpFormat(),$J["format"],0)."\n";echo($w=="sqlite"?"":"<tr><th>".'Database'."<td>".html_select('db_style',$Wb,$J["db_style"]).(support("routine")?checkbox("routines",1,$J["routines"],'Routines'):"").(support("event")?checkbox("events",1,$J["events"],'Events'):"")),"<tr><th>".'Tables'."<td>".html_select('table_style',$Lh,$J["table_style"]).checkbox("auto_increment",1,$J["auto_increment"],'Auto Increment').(support("trigger")?checkbox("triggers",1,$J["triggers"],'Triggers'):""),"<tr><th>".'Data'."<td>".html_select('data_style',$Sb,$J["data_style"]),'</table>
<p><input type="submit" value="Export">
<input type="hidden" name="token" value="',$gi,'">

<table cellspacing="0">
',script("qsl('table').onclick = dumpClick;");$eg=array();if(DB!=""){$eb=($a!=""?"":" checked");echo"<thead><tr>","<th style='text-align: left;'><label class='block'><input type='checkbox' id='check-tables'$eb>".'Tables'."</label>".script("qs('#check-tables').onclick = partial(formCheck, /^tables\\[/);",""),"<th style='text-align: right;'><label class='block'>".'Data'."<input type='checkbox' id='check-data'$eb></label>".script("qs('#check-data').onclick = partial(formCheck, /^data\\[/);",""),"</thead>\n";$Ti="";$Mh=tables_list();foreach($Mh
as$B=>$T){$dg=preg_replace('~_.*~','',$B);$eb=($a==""||$a==(substr($a,-1)=="%"?"$dg%":$B));$hg="<tr><td>".checkbox("tables[]",$B,$eb,$B,"","block");if($T!==null&&!preg_match('~table~i',$T))$Ti.="$hg\n";else
echo"$hg<td align='right'><label class='block'><span id='Rows-".h($B)."'></span>".checkbox("data[]",$B,$eb)."</label>\n";$eg[$dg]++;}echo$Ti;if($Mh)echo
script("ajaxSetHtml('".js_escape(ME)."script=db');");}else{echo"<thead><tr><th style='text-align: left;'>","<label class='block'><input type='checkbox' id='check-databases'".($a==""?" checked":"").">".'Database'."</label>",script("qs('#check-databases').onclick = partial(formCheck, /^databases\\[/);",""),"</thead>\n";$i=$b->databases();if($i){foreach($i
as$j){if(!information_schema($j)){$dg=preg_replace('~_.*~','',$j);echo"<tr><td>".checkbox("databases[]",$j,$a==""||$a=="$dg%",$j,"","block")."\n";$eg[$dg]++;}}}else
echo"<tr><td><textarea name='databases' rows='10' cols='20'></textarea>";}echo'</table>
</form>
';$bd=true;foreach($eg
as$x=>$X){if($x!=""&&$X>1){echo($bd?"<p>":" ")."<a href='".h(ME)."dump=".urlencode("$x%")."'>".h($x)."</a>";$bd=false;}}}elseif(isset($_GET["privileges"])){page_header('Privileges');echo'<p class="links"><a href="'.h(ME).'user=">'.'Create user'."</a>";$H=$f->query("SELECT User, Host FROM mysql.".(DB==""?"user":"db WHERE ".q(DB)." LIKE Db")." ORDER BY Host, User");$qd=$H;if(!$H)$H=$f->query("SELECT SUBSTRING_INDEX(CURRENT_USER, '@', 1) AS User, SUBSTRING_INDEX(CURRENT_USER, '@', -1) AS Host");echo"<form action=''><p>\n";hidden_fields_get();echo"<input type='hidden' name='db' value='".h(DB)."'>\n",($qd?"":"<input type='hidden' name='grant' value=''>\n"),"<table cellspacing='0'>\n","<thead><tr><th>".'Username'."<th>".'Server'."<th></thead>\n";while($J=$H->fetch_assoc())echo'<tr'.odd().'><td>'.h($J["User"])."<td>".h($J["Host"]).'<td><a href="'.h(ME.'user='.urlencode($J["User"]).'&host='.urlencode($J["Host"])).'">'.'Edit'."</a>\n";if(!$qd||DB!="")echo"<tr".odd()."><td><input name='user' autocapitalize='off'><td><input name='host' value='localhost' autocapitalize='off'><td><input type='submit' value='".'Edit'."'>\n";echo"</table>\n","</form>\n";}elseif(isset($_GET["sql"])){if(!$l&&$_POST["export"]){dump_headers("sql");$b->dumpTable("","");$b->dumpData("","table",$_POST["query"]);exit;}restart_session();$Dd=&get_session("queries");$Cd=&$Dd[DB];if(!$l&&$_POST["clear"]){$Cd=array();redirect(remove_from_uri("history"));}page_header((isset($_GET["import"])?'Import':'SQL command'),$l);if(!$l&&$_POST){$q=false;if(!isset($_GET["import"]))$G=$_POST["query"];elseif($_POST["webfile"]){$th=$b->importServerPath();$q=@fopen((file_exists($th)?$th:"compress.zlib://$th.gz"),"rb");$G=($q?fread($q,1e6):false);}else$G=get_file("sql_file",true);if(is_string($G)){if(function_exists('memory_get_usage')&&($Ie=ini_bytes("memory_limit"))!="-1")@ini_set("memory_limit",max($Ie,2*strlen($G)+memory_get_usage()+8e6));if($G!=""&&strlen($G)<1e6){$og=$G.(preg_match("~;[ \t\r\n]*\$~",$G)?"":";");if(!$Cd||reset(end($Cd))!=$og){restart_session();$Cd[]=array($og,time());set_session("queries",$Dd);stop_session();}}$qh="(?:\\s|/\\*[\s\S]*?\\*/|(?:#|-- )[^\n]*\n?|--\r?\n)";$dc=";";$C=0;$Ac=true;$g=connect();if(is_object($g)&&DB!=""){$g->select_db(DB);if($_GET["ns"]!="")set_schema($_GET["ns"],$g);}$tb=0;$Fc=array();$Mf='[\'"'.($w=="sql"?'`#':($w=="sqlite"?'`[':($w=="mssql"?'[':''))).']|/\*|-- |$'.($w=="pgsql"?'|\$[^$]*\$':'');$ii=microtime(true);parse_str($_COOKIE["adminer_export"],$xa);$sc=$b->dumpFormat();unset($sc["sql"]);while($G!=""){if(!$C&&preg_match("~^$qh*+DELIMITER\\s+(\\S+)~i",$G,$A)){$dc=$A[1];$G=substr($G,strlen($A[0]));}else{preg_match('('.preg_quote($dc)."\\s*|$Mf)",$G,$A,PREG_OFFSET_CAPTURE,$C);list($ld,$Zf)=$A[0];if(!$ld&&$q&&!feof($q))$G.=fread($q,1e5);else{if(!$ld&&rtrim($G)=="")break;$C=$Zf+strlen($ld);if($ld&&rtrim($ld)!=$dc){$Ya=is_c_style_escapes()||($w=="pgsql"&&($Zf>0&&strtolower($G[$Zf-1])=="e"));$Uf=($ld=='/*'?'\*/':($ld=='['?']':(preg_match('~^-- |^#~',$ld)?"\n":preg_quote($ld).($Ya?"|\\\\.":""))));while(preg_match("($Uf|\$)s",$G,$A,PREG_OFFSET_CAPTURE,$C)){$Qg=$A[0][0];if(!$Qg&&$q&&!feof($q))$G.=fread($q,1e5);else{$C=$A[0][1]+strlen($Qg);if(!$Qg||$Qg[0]!="\\")break;}}}else{$Ac=false;$og=substr($G,0,$Zf);$tb++;$hg="<pre id='sql-$tb'><code class='jush-$w'>".$b->sqlCommandQuery($og)."</code></pre>\n";if($w=="sqlite"&&preg_match("~^$qh*+ATTACH\\b~i",$og,$A)){echo$hg,"<p class='error'>".'ATTACH queries are not supported.'."\n";$Fc[]=" <a href='#sql-$tb'>$tb</a>";if($_POST["error_stops"])break;}else{if(!$_POST["only_errors"]){echo$hg;ob_flush();flush();}$xh=microtime(true);if($f->multi_query($og)&&is_object($g)&&preg_match("~^$qh*+USE\\b~i",$og))$g->query($og);do{$H=$f->store_result();if($f->error){echo($_POST["only_errors"]?$hg:""),"<p class='error'>".'Error in query'.($f->errno?" ($f->errno)":"").": ".error()."\n";$Fc[]=" <a href='#sql-$tb'>$tb</a>";if($_POST["error_stops"])break
2;}else{$Wh=" <span class='time'>(".format_time($xh).")</span>".(strlen($og)<1000?" <a href='".h(ME)."sql=".urlencode(trim($og))."'>".'Edit'."</a>":"");$za=$f->affected_rows;$Wi=($_POST["only_errors"]?"":$k->warnings());$Xi="warnings-$tb";if($Wi)$Wh.=", <a href='#$Xi'>".'Warnings'."</a>".script("qsl('a').onclick = partial(toggle, '$Xi');","");$Nc=null;$Oc="explain-$tb";if(is_object($H)){$y=$_POST["limit"];$zf=select($H,$g,array(),$y);if(!$_POST["only_errors"]){echo"<form action='' method='post'>\n";$cf=$H->num_rows;echo"<p>".($cf?($y&&$cf>$y?sprintf('%d / ',$y):"").lang(array('%d row','%d rows'),$cf):""),$Wh;if($g&&preg_match("~^($qh|\\()*+SELECT\\b~i",$og)&&($Nc=explain($g,$og)))echo", <a href='#$Oc'>Explain</a>".script("qsl('a').onclick = partial(toggle, '$Oc');","");$Gd="export-$tb";echo", <a href='#$Gd'>".'Export'."</a>".script("qsl('a').onclick = partial(toggle, '$Gd');","")."<span id='$Gd' class='hidden'>: ".html_select("output",$b->dumpOutput(),$xa["output"])." ".html_select("format",$sc,$xa["format"])."<input type='hidden' name='query' value='".h($og)."'>"." <input type='submit' name='export' value='".'Export'."'><input type='hidden' name='token' value='$gi'></span>\n"."</form>\n";}}else{if(preg_match("~^$qh*+(CREATE|DROP|ALTER)$qh++(DATABASE|SCHEMA)\\b~i",$og)){restart_session();set_session("dbs",null);stop_session();}if(!$_POST["only_errors"])echo"<p class='message' title='".h($f->info)."'>".lang(array('Query executed OK, %d row affected.','Query executed OK, %d rows affected.'),$za)."$Wh\n";}echo($Wi?"<div id='$Xi' class='hidden'>\n$Wi</div>\n":"");if($Nc){echo"<div id='$Oc' class='hidden explain'>\n";select($Nc,$g,$zf);echo"</div>\n";}}$xh=microtime(true);}while($f->next_result());}$G=substr($G,$C);$C=0;}}}}if($Ac)echo"<p class='message'>".'No commands to execute.'."\n";elseif($_POST["only_errors"]){echo"<p class='message'>".lang(array('%d query executed OK.','%d queries executed OK.'),$tb-count($Fc))," <span class='time'>(".format_time($ii).")</span>\n";}elseif($Fc&&$tb>1)echo"<p class='error'>".'Error in query'.": ".implode("",$Fc)."\n";}else
echo"<p class='error'>".upload_error($G)."\n";}echo'
<form action="" method="post" enctype="multipart/form-data" id="form">
';$Lc="<input type='submit' value='".'Execute'."' title='Ctrl+Enter'>";if(!isset($_GET["import"])){$og=$_GET["sql"];if($_POST)$og=$_POST["query"];elseif($_GET["history"]=="all")$og=$Cd;elseif($_GET["history"]!="")$og=$Cd[$_GET["history"]][0];echo"<p>";textarea("query",$og,20);echo
script(($_POST?"":"qs('textarea').focus();\n")."qs('#form').onsubmit = partial(sqlSubmit, qs('#form'), '".js_escape(remove_from_uri("sql|limit|error_stops|only_errors|history"))."');"),"<p>$Lc\n",'Limit rows'.": <input type='number' name='limit' class='size' value='".h($_POST?$_POST["limit"]:$_GET["limit"])."'>\n";}else{echo"<fieldset><legend>".'File upload'."</legend><div>";$wd=(extension_loaded("zlib")?"[.gz]":"");echo(ini_bool("file_uploads")?"SQL$wd (&lt; ".ini_get("upload_max_filesize")."B): <input type='file' name='sql_file[]' multiple>\n$Lc":'File uploads are disabled.'),"</div></fieldset>\n";$Jd=$b->importServerPath();if($Jd){echo"<fieldset><legend>".'From server'."</legend><div>",sprintf('Webserver file %s',"<code>".h($Jd)."$wd</code>"),' <input type="submit" name="webfile" value="'.'Run file'.'">',"</div></fieldset>\n";}echo"<p>";}echo
checkbox("error_stops",1,($_POST?$_POST["error_stops"]:isset($_GET["import"])||$_GET["error_stops"]),'Stop on error')."\n",checkbox("only_errors",1,($_POST?$_POST["only_errors"]:isset($_GET["import"])||$_GET["only_errors"]),'Show only errors')."\n","<input type='hidden' name='token' value='$gi'>\n";if(!isset($_GET["import"])&&$Cd){print_fieldset("history",'History',$_GET["history"]!="");for($X=end($Cd);$X;$X=prev($Cd)){$x=key($Cd);list($og,$Wh,$wc)=$X;echo'<a href="'.h(ME."sql=&history=$x").'">'.'Edit'."</a>"." <span class='time' title='".@date('Y-m-d',$Wh)."'>".@date("H:i:s",$Wh)."</span>"." <code class='jush-$w'>".shorten_utf8(ltrim(str_replace("\n"," ",str_replace("\r","",preg_replace('~^(#|-- ).*~m','',$og)))),80,"</code>").($wc?" <span class='time'>($wc)</span>":"")."<br>\n";}echo"<input type='submit' name='clear' value='".'Clear'."'>\n","<a href='".h(ME."sql=&history=all")."'>".'Edit all'."</a>\n","</div></fieldset>\n";}echo'</form>
';}elseif(isset($_GET["edit"])){$a=$_GET["edit"];$n=fields($a);$Z=(isset($_GET["select"])?($_POST["check"]&&count($_POST["check"])==1?where_check($_POST["check"][0],$n):""):where($_GET,$n));$Ci=(isset($_GET["select"])?$_POST["edit"]:$Z);foreach($n
as$B=>$m){if(!isset($m["privileges"][$Ci?"update":"insert"])||$b->fieldName($m)==""||$m["generated"])unset($n[$B]);}if($_POST&&!$l&&!isset($_GET["select"])){$_=$_POST["referer"];if($_POST["insert"])$_=($Ci?null:$_SERVER["REQUEST_URI"]);elseif(!preg_match('~^.+&select=.+$~',$_))$_=ME."select=".urlencode($a);$v=indexes($a);$yi=unique_array($_GET["where"],$v);$rg="\nWHERE $Z";if(isset($_POST["delete"]))queries_redirect($_,'Item has been deleted.',$k->delete($a,$rg,!$yi));else{$N=array();foreach($n
as$B=>$m){$X=process_input($m);if($X!==false&&$X!==null)$N[idf_escape($B)]=$X;}if($Ci){if(!$N)redirect($_);queries_redirect($_,'Item has been updated.',$k->update($a,$N,$rg,!$yi));if(is_ajax()){page_headers();page_messages($l);exit;}}else{$H=$k->insert($a,$N);$ne=($H?last_id():0);queries_redirect($_,sprintf('Item%s has been inserted.',($ne?" $ne":"")),$H);}}}$J=null;if($_POST["save"])$J=(array)$_POST["fields"];elseif($Z){$L=array();foreach($n
as$B=>$m){if(isset($m["privileges"]["select"])){$Fa=convert_field($m);if($_POST["clone"]&&$m["auto_increment"])$Fa="''";if($w=="sql"&&preg_match("~enum|set~",$m["type"]))$Fa="1*".idf_escape($B);$L[]=($Fa?"$Fa AS ":"").idf_escape($B);}}$J=array();if(!support("table"))$L=array("*");if($L){$H=$k->select($a,$L,array($Z),$L,array(),(isset($_GET["select"])?2:1));if(!$H)$l=error();else{$J=$H->fetch_assoc();if(!$J)$J=false;}if(isset($_GET["select"])&&(!$J||$H->fetch_assoc()))$J=null;}}if(!support("table")&&!$n){if(!$Z){$H=$k->select($a,array("*"),$Z,array("*"));$J=($H?$H->fetch_assoc():false);if(!$J)$J=array($k->primary=>"");}if($J){foreach($J
as$x=>$X){if(!$Z)$J[$x]=null;$n[$x]=array("field"=>$x,"null"=>($x!=$k->primary),"auto_increment"=>($x==$k->primary));}}}edit_form($a,$n,$J,$Ci);}elseif(isset($_GET["create"])){$a=$_GET["create"];$Of=array();foreach(array('HASH','LINEAR HASH','KEY','LINEAR KEY','RANGE','LIST')as$x)$Of[$x]=$x;$xg=referencable_primary($a);$jd=array();foreach($xg
as$Hh=>$m)$jd[str_replace("`","``",$Hh)."`".str_replace("`","``",$m["field"])]=$Hh;$Bf=array();$R=array();if($a!=""){$Bf=fields($a);$R=table_status($a);if(!$R)$l='No tables.';}$J=$_POST;$J["fields"]=(array)$J["fields"];if($J["auto_increment_col"])$J["fields"][$J["auto_increment_col"]]["auto_increment"]=true;if($_POST)set_adminer_settings(array("comments"=>$_POST["comments"],"defaults"=>$_POST["defaults"]));if($_POST&&!process_fields($J["fields"])&&!$l){if($_POST["drop"])queries_redirect(substr(ME,0,-1),'Table has been dropped.',drop_tables(array($a)));else{$n=array();$Ca=array();$Gi=false;$hd=array();$Af=reset($Bf);$Aa=" FIRST";foreach($J["fields"]as$x=>$m){$p=$jd[$m["type"]];$ti=($p!==null?$xg[$p]:$m);if($m["field"]!=""){if(!$m["has_default"])$m["default"]=null;$mg=process_field($m,$ti);$Ca[]=array($m["orig"],$mg,$Aa);if(!$Af||$mg!==process_field($Af,$Af)){$n[]=array($m["orig"],$mg,$Aa);if($m["orig"]!=""||$Aa)$Gi=true;}if($p!==null)$hd[idf_escape($m["field"])]=($a!=""&&$w!="sqlite"?"ADD":" ").format_foreign_key(array('table'=>$jd[$m["type"]],'source'=>array($m["field"]),'target'=>array($ti["field"]),'on_delete'=>$m["on_delete"],));$Aa=" AFTER ".idf_escape($m["field"]);}elseif($m["orig"]!=""){$Gi=true;$n[]=array($m["orig"]);}if($m["orig"]!=""){$Af=next($Bf);if(!$Af)$Aa="";}}$Qf="";if(support("partitioning")){if(isset($Of[$J["partition_by"]])){$Lf=array_filter($J,function($x){return
preg_match('~^partition~',$x);},ARRAY_FILTER_USE_KEY);foreach($Lf["partition_names"]as$x=>$B){if($B==""){unset($Lf["partition_names"][$x]);unset($Lf["partition_values"][$x]);}}if($Lf!=get_partitions_info($a)){$Rf=array();if($Lf["partition_by"]=='RANGE'||$Lf["partition_by"]=='LIST'){foreach($Lf["partition_names"]as$x=>$B){$Y=$Lf["partition_values"][$x];$Rf[]="\n  PARTITION ".idf_escape($B)." VALUES ".($Lf["partition_by"]=='RANGE'?"LESS THAN":"IN").($Y!=""?" ($Y)":" MAXVALUE");}}$Qf.="\nPARTITION BY $Lf[partition_by]($Lf[partition])";if($Rf)$Qf.=" (".implode(",",$Rf)."\n)";elseif($Lf["partitions"])$Qf.=" PARTITIONS ".(+$Lf["partitions"]);}}elseif(preg_match("~partitioned~",$R["Create_options"]))$Qf.="\nREMOVE PARTITIONING";}$Je='Table has been altered.';if($a==""){cookie("adminer_engine",$J["Engine"]);$Je='Table has been created.';}$B=trim($J["name"]);queries_redirect(ME.(support("table")?"table=":"select=").urlencode($B),$Je,alter_table($a,$B,($w=="sqlite"&&($Gi||$hd)?$Ca:$n),$hd,($J["Comment"]!=$R["Comment"]?$J["Comment"]:null),($J["Engine"]&&$J["Engine"]!=$R["Engine"]?$J["Engine"]:""),($J["Collation"]&&$J["Collation"]!=$R["Collation"]?$J["Collation"]:""),($J["Auto_increment"]!=""?number($J["Auto_increment"]):""),$Qf));}}page_header(($a!=""?'Alter table':'Create table'),$l,array("table"=>$a),h($a));if(!$_POST){$J=array("Engine"=>$_COOKIE["adminer_engine"],"fields"=>array(array("field"=>"","type"=>(isset($U["int"])?"int":(isset($U["integer"])?"integer":"")),"on_update"=>"")),"partition_names"=>array(""),);if($a!=""){$J=$R;$J["name"]=$a;$J["fields"]=array();if(!$_GET["auto_increment"])$J["Auto_increment"]="";foreach($Bf
as$m){$m["has_default"]=isset($m["default"]);$J["fields"][]=$m;}if(support("partitioning")){$J+=get_partitions_info($a);$J["partition_names"][]="";$J["partition_values"][]="";}}}$ob=collations();$Cc=engines();foreach($Cc
as$Bc){if(!strcasecmp($Bc,$J["Engine"])){$J["Engine"]=$Bc;break;}}echo'
<form action="" method="post" id="form">
<p>
';if(support("columns")||$a==""){echo'Table name: <input name="name"',($a==""&&!$_POST?" autofocus":""),' data-maxlength="64" value="',h($J["name"]),'" autocapitalize="off">
',($Cc?"<select name='Engine'>".optionlist(array(""=>"(".'engine'.")")+$Cc,$J["Engine"])."</select>".on_help("getTarget(event).value",1).script("qsl('select').onchange = helpClose;"):""),' ',($ob&&!preg_match("~sqlite|mssql~",$w)?html_select("Collation",array(""=>"(".'collation'.")")+$ob,$J["Collation"]):""),' <input type="submit" value="Save">
';}echo'
';if(support("columns")){echo'<div class="scrollable">
<table cellspacing="0" id="edit-fields" class="nowrap">
';edit_fields($J["fields"],$ob,"TABLE",$jd);echo'</table>
',script("editFields();"),'</div>
<p>
Auto Increment: <input type="number" name="Auto_increment" size="6" value="',h($J["Auto_increment"]),'">
',checkbox("defaults",1,($_POST?$_POST["defaults"]:adminer_setting("defaults")),'Default values',"columnShow(this.checked, 5)","jsonly");$wb=($_POST?$_POST["comments"]:adminer_setting("comments"));echo(support("comment")?checkbox("comments",1,$wb,'Comment',"editingCommentsClick(this, true);","jsonly").' '.(preg_match('~\n~',$J["Comment"])?"<textarea name='Comment' rows='2' cols='20'".($wb?"":" class='hidden'").">".h($J["Comment"])."</textarea>":'<input name="Comment" value="'.h($J["Comment"]).'" data-maxlength="'.(min_version(5.5)?2048:60).'"'.($wb?"":" class='hidden'").'>'):''),'<p>
<input type="submit" value="Save">
';}echo'
';if($a!=""){echo'<input type="submit" name="drop" value="Drop">',confirm(sprintf('Drop %s?',$a));}if(support("partitioning")){$Pf=preg_match('~RANGE|LIST~',$J["partition_by"]);print_fieldset("partition",'Partition by',$J["partition_by"]);echo'<p>
',"<select name='partition_by'>".optionlist(array(""=>"")+$Of,$J["partition_by"])."</select>".on_help("getTarget(event).value.replace(/./, 'PARTITION BY \$&')",1).script("qsl('select').onchange = partitionByChange;"),'(<input name="partition" value="',h($J["partition"]),'">)
Partitions: <input type="number" name="partitions" class="size',($Pf||!$J["partition_by"]?" hidden":""),'" value="',h($J["partitions"]),'">
<table cellspacing="0" id="partition-table"',($Pf?"":" class='hidden'"),'>
<thead><tr><th>Partition name<th>Values</thead>
';foreach($J["partition_names"]as$x=>$X){echo'<tr>','<td><input name="partition_names[]" value="'.h($X).'" autocapitalize="off">',($x==count($J["partition_names"])-1?script("qsl('input').oninput = partitionNameChange;"):''),'<td><input name="partition_values[]" value="'.h($J["partition_values"][$x]).'">';}echo'</table>
</div></fieldset>
';}echo'<input type="hidden" name="token" value="',$gi,'">
</form>
';}elseif(isset($_GET["indexes"])){$a=$_GET["indexes"];$Nd=array("PRIMARY","UNIQUE","INDEX");$R=table_status($a,true);if(preg_match('~MyISAM|M?aria'.(min_version(5.6,'10.0.5')?'|InnoDB':'').'~i',$R["Engine"]))$Nd[]="FULLTEXT";if(preg_match('~MyISAM|M?aria'.(min_version(5.7,'10.2.2')?'|InnoDB':'').'~i',$R["Engine"]))$Nd[]="SPATIAL";$v=indexes($a);$fg=array();if($w=="mongo"){$fg=$v["_id_"];unset($Nd[0]);unset($v["_id_"]);}$J=$_POST;if($_POST&&!$l&&!$_POST["add"]&&!$_POST["drop_col"]){$c=array();foreach($J["indexes"]as$u){$B=$u["name"];if(in_array($u["type"],$Nd)){$e=array();$te=array();$fc=array();$N=array();ksort($u["columns"]);foreach($u["columns"]as$x=>$d){if($d!=""){$se=$u["lengths"][$x];$ec=$u["descs"][$x];$N[]=idf_escape($d).($se?"(".(+$se).")":"").($ec?" DESC":"");$e[]=$d;$te[]=($se?$se:null);$fc[]=$ec;}}if($e){$Mc=$v[$B];if($Mc){ksort($Mc["columns"]);ksort($Mc["lengths"]);ksort($Mc["descs"]);if($u["type"]==$Mc["type"]&&array_values($Mc["columns"])===$e&&(!$Mc["lengths"]||array_values($Mc["lengths"])===$te)&&array_values($Mc["descs"])===$fc){unset($v[$B]);continue;}}$c[]=array($u["type"],$B,$N);}}}foreach($v
as$B=>$Mc)$c[]=array($Mc["type"],$B,"DROP");if(!$c)redirect(ME."table=".urlencode($a));queries_redirect(ME."table=".urlencode($a),'Indexes have been altered.',alter_indexes($a,$c));}page_header('Indexes',$l,array("table"=>$a),h($a));$n=array_keys(fields($a));if($_POST["add"]){foreach($J["indexes"]as$x=>$u){if($u["columns"][count($u["columns"])]!="")$J["indexes"][$x]["columns"][]="";}$u=end($J["indexes"]);if($u["type"]||array_filter($u["columns"],'strlen'))$J["indexes"][]=array("columns"=>array(1=>""));}if(!$J){foreach($v
as$x=>$u){$v[$x]["name"]=$x;$v[$x]["columns"][]="";}$v[]=array("columns"=>array(1=>""));$J["indexes"]=$v;}echo'
<form action="" method="post">
<div class="scrollable">
<table cellspacing="0" class="nowrap">
<thead><tr>
<th id="label-type">Index Type
<th><input type="submit" class="wayoff">Column (length)
<th id="label-name">Name
<th><noscript>',"<input type='image' class='icon' name='add[0]' src='".h(preg_replace("~\\?.*~","",ME)."?file=plus.gif&version=4.16.0")."' alt='+' title='".'Add next'."'>",'</noscript>
</thead>
';if($fg){echo"<tr><td>PRIMARY<td>";foreach($fg["columns"]as$x=>$d){echo
select_input(" disabled",$n,$d),"<label><input disabled type='checkbox'>".'descending'."</label> ";}echo"<td><td>\n";}$de=1;foreach($J["indexes"]as$u){if(!$_POST["drop_col"]||$de!=key($_POST["drop_col"])){echo"<tr><td>".html_select("indexes[$de][type]",array(-1=>"")+$Nd,$u["type"],($de==count($J["indexes"])?"indexesAddRow.call(this);":1),"label-type"),"<td>";ksort($u["columns"]);$s=1;foreach($u["columns"]as$x=>$d){echo"<span>".select_input(" name='indexes[$de][columns][$s]' title='".'Column'."'",($n?array_combine($n,$n):$n),$d,"partial(".($s==count($u["columns"])?"indexesAddColumn":"indexesChangeColumn").", '".js_escape($w=="sql"?"":$_GET["indexes"]."_")."')"),($w=="sql"||$w=="mssql"?"<input type='number' name='indexes[$de][lengths][$s]' class='size' value='".h($u["lengths"][$x])."' title='".'Length'."'>":""),(support("descidx")?checkbox("indexes[$de][descs][$s]",1,$u["descs"][$x],'descending'):"")," </span>";$s++;}echo"<td><input name='indexes[$de][name]' value='".h($u["name"])."' autocapitalize='off' aria-labelledby='label-name'>\n","<td><input type='image' class='icon' name='drop_col[$de]' src='".h(preg_replace("~\\?.*~","",ME)."?file=cross.gif&version=4.16.0")."' alt='x' title='".'Remove'."'>".script("qsl('input').onclick = partial(editingRemoveRow, 'indexes\$1[type]');");}$de++;}echo'</table>
</div>
<p>
<input type="submit" value="Save">
<input type="hidden" name="token" value="',$gi,'">
</form>
';}elseif(isset($_GET["database"])){$J=$_POST;if($_POST&&!$l&&!isset($_POST["add_x"])){$B=trim($J["name"]);if($_POST["drop"]){$_GET["db"]="";queries_redirect(remove_from_uri("db|database"),'Database has been dropped.',drop_databases(array(DB)));}elseif(DB!==$B){if(DB!=""){$_GET["db"]=$B;queries_redirect(preg_replace('~\bdb=[^&]*&~','',ME)."db=".urlencode($B),'Database has been renamed.',rename_database($B,$J["collation"]));}else{$i=explode("\n",str_replace("\r","",$B));$Bh=true;$me="";foreach($i
as$j){if(count($i)==1||$j!=""){if(!create_database($j,$J["collation"]))$Bh=false;$me=$j;}}restart_session();set_session("dbs",null);queries_redirect(ME."db=".urlencode($me),'Database has been created.',$Bh);}}else{if(!$J["collation"])redirect(substr(ME,0,-1));query_redirect("ALTER DATABASE ".idf_escape($B).(preg_match('~^[a-z0-9_]+$~i',$J["collation"])?" COLLATE $J[collation]":""),substr(ME,0,-1),'Database has been altered.');}}page_header(DB!=""?'Alter database':'Create database',$l,array(),h(DB));$ob=collations();$B=DB;if($_POST)$B=$J["name"];elseif(DB!="")$J["collation"]=db_collation(DB,$ob);elseif($w=="sql"){foreach(get_vals("SHOW GRANTS")as$qd){if(preg_match('~ ON (`(([^\\\\`]|``|\\\\.)*)%`\.\*)?~',$qd,$A)&&$A[1]){$B=stripcslashes(idf_unescape("`$A[2]`"));break;}}}echo'
<form action="" method="post">
<p>
',($_POST["add_x"]||strpos($B,"\n")?'<textarea autofocus name="name" rows="10" cols="40">'.h($B).'</textarea><br>':'<input name="name" autofocus value="'.h($B).'" data-maxlength="64" autocapitalize="off">')."\n".($ob?html_select("collation",array(""=>"(".'collation'.")")+$ob,$J["collation"]).doc_link(array('sql'=>"charset-charsets.html",'mariadb'=>"supported-character-sets-and-collations/",'mssql'=>"ms187963.aspx",)):""),'<input type="submit" value="Save">
';if(DB!="")echo"<input type='submit' name='drop' value='".'Drop'."'>".confirm(sprintf('Drop %s?',DB))."\n";elseif(!$_POST["add_x"]&&$_GET["db"]=="")echo"<input type='image' class='icon' name='add' src='".h(preg_replace("~\\?.*~","",ME)."?file=plus.gif&version=4.16.0")."' alt='+' title='".'Add next'."'>\n";echo'<input type="hidden" name="token" value="',$gi,'">
</form>
';}elseif(isset($_GET["scheme"])){$J=$_POST;if($_POST&&!$l){$z=preg_replace('~ns=[^&]*&~','',ME)."ns=";if($_POST["drop"])query_redirect("DROP SCHEMA ".idf_escape($_GET["ns"]),$z,'Schema has been dropped.');else{$B=trim($J["name"]);$z.=urlencode($B);if($_GET["ns"]=="")query_redirect("CREATE SCHEMA ".idf_escape($B),$z,'Schema has been created.');elseif($_GET["ns"]!=$B)query_redirect("ALTER SCHEMA ".idf_escape($_GET["ns"])." RENAME TO ".idf_escape($B),$z,'Schema has been altered.');else
redirect($z);}}page_header($_GET["ns"]!=""?'Alter schema':'Create schema',$l);if(!$J)$J["name"]=$_GET["ns"];echo'
<form action="" method="post">
<p><input name="name" autofocus value="',h($J["name"]),'" autocapitalize="off">
<input type="submit" value="Save">
';if($_GET["ns"]!="")echo"<input type='submit' name='drop' value='".'Drop'."'>".confirm(sprintf('Drop %s?',$_GET["ns"]))."\n";echo'<input type="hidden" name="token" value="',$gi,'">
</form>
';}elseif(isset($_GET["call"])){$da=($_GET["name"]?$_GET["name"]:$_GET["call"]);page_header('Call'.": ".h($da),$l);$Mg=routine($_GET["call"],(isset($_GET["callf"])?"FUNCTION":"PROCEDURE"));$Kd=array();$Ff=array();foreach($Mg["fields"]as$s=>$m){if(substr($m["inout"],-3)=="OUT")$Ff[$s]="@".idf_escape($m["field"])." AS ".idf_escape($m["field"]);if(!$m["inout"]||substr($m["inout"],0,2)=="IN")$Kd[]=$s;}if(!$l&&$_POST){$Za=array();foreach($Mg["fields"]as$x=>$m){if(in_array($x,$Kd)){$X=process_input($m);if($X===false)$X="''";if(isset($Ff[$x]))$f->query("SET @".idf_escape($m["field"])." = $X");}$Za[]=(isset($Ff[$x])?"@".idf_escape($m["field"]):$X);}$G=(isset($_GET["callf"])?"SELECT":"CALL")." ".table($da)."(".implode(", ",$Za).")";$xh=microtime(true);$H=$f->multi_query($G);$za=$f->affected_rows;echo$b->selectQuery($G,$xh,!$H);if(!$H)echo"<p class='error'>".error()."\n";else{$g=connect();if(is_object($g))$g->select_db(DB);do{$H=$f->store_result();if(is_object($H))select($H,$g);else
echo"<p class='message'>".lang(array('Routine has been called, %d row affected.','Routine has been called, %d rows affected.'),$za)." <span class='time'>".@date("H:i:s")."</span>\n";}while($f->next_result());if($Ff)select($f->query("SELECT ".implode(", ",$Ff)));}}echo'
<form action="" method="post">
';if($Kd){echo"<table cellspacing='0' class='layout'>\n";foreach($Kd
as$x){$m=$Mg["fields"][$x];$B=$m["field"];echo"<tr><th>".$b->fieldName($m);$Y=$_POST["fields"][$B];if($Y!=""){if($m["type"]=="enum")$Y=+$Y;if($m["type"]=="set")$Y=array_sum($Y);}input($m,$Y,(string)$_POST["function"][$B]);echo"\n";}echo"</table>\n";}echo'<p>
<input type="submit" value="Call">
<input type="hidden" name="token" value="',$gi,'">
</form>
';}elseif(isset($_GET["foreign"])){$a=$_GET["foreign"];$B=$_GET["name"];$J=$_POST;if($_POST&&!$l&&!$_POST["add"]&&!$_POST["change"]&&!$_POST["change-js"]){$Je=($_POST["drop"]?'Foreign key has been dropped.':($B!=""?'Foreign key has been altered.':'Foreign key has been created.'));$_=ME."table=".urlencode($a);if(!$_POST["drop"]){$J["source"]=array_filter($J["source"],'strlen');ksort($J["source"]);$Ph=array();foreach($J["source"]as$x=>$X)$Ph[$x]=$J["target"][$x];$J["target"]=$Ph;}if($w=="sqlite")queries_redirect($_,$Je,recreate_table($a,$a,array(),array(),array(" $B"=>($_POST["drop"]?"":" ".format_foreign_key($J)))));else{$c="ALTER TABLE ".table($a);$nc="\nDROP ".($w=="sql"?"FOREIGN KEY ":"CONSTRAINT ").idf_escape($B);if($_POST["drop"])query_redirect($c.$nc,$_,$Je);else{query_redirect($c.($B!=""?"$nc,":"")."\nADD".format_foreign_key($J),$_,$Je);$l='Source and target columns must have the same data type, there must be an index on the target columns and referenced data must exist.'."<br>$l";}}}page_header('Foreign key',$l,array("table"=>$a),h($a));if($_POST){ksort($J["source"]);if($_POST["add"])$J["source"][]="";elseif($_POST["change"]||$_POST["change-js"])$J["target"]=array();}elseif($B!=""){$jd=foreign_keys($a);$J=$jd[$B];$J["source"][]="";}else{$J["table"]=$a;$J["source"]=array("");}echo'
<form action="" method="post">
';$ph=array_keys(fields($a));if($J["db"]!="")$f->select_db($J["db"]);if($J["ns"]!="")set_schema($J["ns"]);$wg=array_keys(array_filter(table_status('',true),'fk_support'));$Ph=array_keys(fields(in_array($J["table"],$wg)?$J["table"]:reset($wg)));$of="this.form['change-js'].value = '1'; this.form.submit();";echo"<p>".'Target table'.": ".html_select("table",$wg,$J["table"],$of)."\n";if($w=="pgsql")echo'Schema'.": ".html_select("ns",$b->schemas(),$J["ns"]!=""?$J["ns"]:$_GET["ns"],$of);elseif($w!="sqlite"){$Xb=array();foreach($b->databases()as$j){if(!information_schema($j))$Xb[]=$j;}echo'DB'.": ".html_select("db",$Xb,$J["db"]!=""?$J["db"]:$_GET["db"],$of);}echo'<input type="hidden" name="change-js" value="">
<noscript><p><input type="submit" name="change" value="Change"></noscript>
<table cellspacing="0">
<thead><tr><th id="label-source">Source<th id="label-target">Target</thead>
';$de=0;foreach($J["source"]as$x=>$X){echo"<tr>","<td>".html_select("source[".(+$x)."]",array(-1=>"")+$ph,$X,($de==count($J["source"])-1?"foreignAddRow.call(this);":1),"label-source"),"<td>".html_select("target[".(+$x)."]",$Ph,$J["target"][$x],1,"label-target");$de++;}echo'</table>
<p>
ON DELETE: ',html_select("on_delete",array(-1=>"")+explode("|",$nf),$J["on_delete"]),' ON UPDATE: ',html_select("on_update",array(-1=>"")+explode("|",$nf),$J["on_update"]),doc_link(array('sql'=>"innodb-foreign-key-constraints.html",'mariadb'=>"foreign-keys/",'pgsql'=>"sql-createtable.html#SQL-CREATETABLE-REFERENCES",'mssql'=>"ms174979.aspx",'oracle'=>"https://docs.oracle.com/cd/B19306_01/server.102/b14200/clauses002.htm#sthref2903",)),'<p>
<input type="submit" value="Save">
<noscript><p><input type="submit" name="add" value="Add column"></noscript>
';if($B!=""){echo'<input type="submit" name="drop" value="Drop">',confirm(sprintf('Drop %s?',$B));}echo'<input type="hidden" name="token" value="',$gi,'">
</form>
';}elseif(isset($_GET["view"])){$a=$_GET["view"];$J=$_POST;$Cf="VIEW";if($w=="pgsql"&&$a!=""){$O=table_status($a);$Cf=strtoupper($O["Engine"]);}if($_POST&&!$l){$B=trim($J["name"]);$Fa=" AS\n$J[select]";$_=ME."table=".urlencode($B);$Je='View has been altered.';$T=($_POST["materialized"]?"MATERIALIZED VIEW":"VIEW");if(!$_POST["drop"]&&$a==$B&&$w!="sqlite"&&$T=="VIEW"&&$Cf=="VIEW")query_redirect(($w=="mssql"?"ALTER":"CREATE OR REPLACE")." VIEW ".table($B).$Fa,$_,$Je);else{$Rh=$B."_adminer_".uniqid();drop_create("DROP $Cf ".table($a),"CREATE $T ".table($B).$Fa,"DROP $T ".table($B),"CREATE $T ".table($Rh).$Fa,"DROP $T ".table($Rh),($_POST["drop"]?substr(ME,0,-1):$_),'View has been dropped.',$Je,'View has been created.',$a,$B);}}if(!$_POST&&$a!=""){$J=view($a);$J["name"]=$a;$J["materialized"]=($Cf!="VIEW");if(!$l)$l=error();}page_header(($a!=""?'Alter view':'Create view'),$l,array("table"=>$a),h($a));echo'
<form action="" method="post">
<p>Name: <input name="name" value="',h($J["name"]),'" data-maxlength="64" autocapitalize="off">
',(support("materializedview")?" ".checkbox("materialized",1,$J["materialized"],'Materialized view'):""),'<p>';textarea("select",$J["select"]);echo'<p>
<input type="submit" value="Save">
';if($a!=""){echo'<input type="submit" name="drop" value="Drop">',confirm(sprintf('Drop %s?',$a));}echo'<input type="hidden" name="token" value="',$gi,'">
</form>
';}elseif(isset($_GET["event"])){$aa=$_GET["event"];$Vd=array("YEAR","QUARTER","MONTH","DAY","HOUR","MINUTE","WEEK","SECOND","YEAR_MONTH","DAY_HOUR","DAY_MINUTE","DAY_SECOND","HOUR_MINUTE","HOUR_SECOND","MINUTE_SECOND");$yh=array("ENABLED"=>"ENABLE","DISABLED"=>"DISABLE","SLAVESIDE_DISABLED"=>"DISABLE ON SLAVE");$J=$_POST;if($_POST&&!$l){if($_POST["drop"])query_redirect("DROP EVENT ".idf_escape($aa),substr(ME,0,-1),'Event has been dropped.');elseif(in_array($J["INTERVAL_FIELD"],$Vd)&&isset($yh[$J["STATUS"]])){$Rg="\nON SCHEDULE ".($J["INTERVAL_VALUE"]?"EVERY ".q($J["INTERVAL_VALUE"])." $J[INTERVAL_FIELD]".($J["STARTS"]?" STARTS ".q($J["STARTS"]):"").($J["ENDS"]?" ENDS ".q($J["ENDS"]):""):"AT ".q($J["STARTS"]))." ON COMPLETION".($J["ON_COMPLETION"]?"":" NOT")." PRESERVE";queries_redirect(substr(ME,0,-1),($aa!=""?'Event has been altered.':'Event has been created.'),queries(($aa!=""?"ALTER EVENT ".idf_escape($aa).$Rg.($aa!=$J["EVENT_NAME"]?"\nRENAME TO ".idf_escape($J["EVENT_NAME"]):""):"CREATE EVENT ".idf_escape($J["EVENT_NAME"]).$Rg)."\n".$yh[$J["STATUS"]]." COMMENT ".q($J["EVENT_COMMENT"]).rtrim(" DO\n$J[EVENT_DEFINITION]",";").";"));}}page_header(($aa!=""?'Alter event'.": ".h($aa):'Create event'),$l);if(!$J&&$aa!=""){$K=get_rows("SELECT * FROM information_schema.EVENTS WHERE EVENT_SCHEMA = ".q(DB)." AND EVENT_NAME = ".q($aa));$J=reset($K);}echo'
<form action="" method="post">
<table cellspacing="0" class="layout">
<tr><th>Name<td><input name="EVENT_NAME" value="',h($J["EVENT_NAME"]),'" data-maxlength="64" autocapitalize="off">
<tr><th title="datetime">Start<td><input name="STARTS" value="',h("$J[EXECUTE_AT]$J[STARTS]"),'">
<tr><th title="datetime">End<td><input name="ENDS" value="',h($J["ENDS"]),'">
<tr><th>Every<td><input type="number" name="INTERVAL_VALUE" value="',h($J["INTERVAL_VALUE"]),'" class="size"> ',html_select("INTERVAL_FIELD",$Vd,$J["INTERVAL_FIELD"]),'<tr><th>Status<td>',html_select("STATUS",$yh,$J["STATUS"]),'<tr><th>Comment<td><input name="EVENT_COMMENT" value="',h($J["EVENT_COMMENT"]),'" data-maxlength="64">
<tr><th><td>',checkbox("ON_COMPLETION","PRESERVE",$J["ON_COMPLETION"]=="PRESERVE",'On completion preserve'),'</table>
<p>';textarea("EVENT_DEFINITION",$J["EVENT_DEFINITION"]);echo'<p>
<input type="submit" value="Save">
';if($aa!=""){echo'<input type="submit" name="drop" value="Drop">',confirm(sprintf('Drop %s?',$aa));}echo'<input type="hidden" name="token" value="',$gi,'">
</form>
';}elseif(isset($_GET["procedure"])){$da=($_GET["name"]?$_GET["name"]:$_GET["procedure"]);$Mg=(isset($_GET["function"])?"FUNCTION":"PROCEDURE");$J=$_POST;$J["fields"]=(array)$J["fields"];if($_POST&&!process_fields($J["fields"])&&!$l){$_f=routine($_GET["procedure"],$Mg);$Rh="$J[name]_adminer_".uniqid();drop_create("DROP $Mg ".routine_id($da,$_f),create_routine($Mg,$J),"DROP $Mg ".routine_id($J["name"],$J),create_routine($Mg,array("name"=>$Rh)+$J),"DROP $Mg ".routine_id($Rh,$J),substr(ME,0,-1),'Routine has been dropped.','Routine has been altered.','Routine has been created.',$da,$J["name"]);}page_header(($da!=""?(isset($_GET["function"])?'Alter function':'Alter procedure').": ".h($da):(isset($_GET["function"])?'Create function':'Create procedure')),$l);if(!$_POST&&$da!=""){$J=routine($_GET["procedure"],$Mg);$J["name"]=$da;}$ob=get_vals("SHOW CHARACTER SET");sort($ob);$Ng=routine_languages();echo'
<form action="" method="post" id="form">
<p>Name: <input name="name" value="',h($J["name"]),'" data-maxlength="64" autocapitalize="off">
',($Ng?'Language'.": ".html_select("language",$Ng,$J["language"])."\n":""),'<input type="submit" value="Save">
<div class="scrollable">
<table cellspacing="0" class="nowrap">
';edit_fields($J["fields"],$ob,$Mg);if(isset($_GET["function"])){echo"<tr><td>".'Return type';edit_type("returns",$J["returns"],$ob,array(),($w=="pgsql"?array("void","trigger"):array()));}echo'</table>
',script("editFields();"),'</div>
<p>';textarea("definition",$J["definition"]);echo'<p>
<input type="submit" value="Save">
';if($da!=""){echo'<input type="submit" name="drop" value="Drop">',confirm(sprintf('Drop %s?',$da));}echo'<input type="hidden" name="token" value="',$gi,'">
</form>
';}elseif(isset($_GET["sequence"])){$fa=$_GET["sequence"];$J=$_POST;if($_POST&&!$l){$z=substr(ME,0,-1);$B=trim($J["name"]);if($_POST["drop"])query_redirect("DROP SEQUENCE ".idf_escape($fa),$z,'Sequence has been dropped.');elseif($fa=="")query_redirect("CREATE SEQUENCE ".idf_escape($B),$z,'Sequence has been created.');elseif($fa!=$B)query_redirect("ALTER SEQUENCE ".idf_escape($fa)." RENAME TO ".idf_escape($B),$z,'Sequence has been altered.');else
redirect($z);}page_header($fa!=""?'Alter sequence'.": ".h($fa):'Create sequence',$l);if(!$J)$J["name"]=$fa;echo'
<form action="" method="post">
<p><input name="name" value="',h($J["name"]),'" autocapitalize="off">
<input type="submit" value="Save">
';if($fa!="")echo"<input type='submit' name='drop' value='".'Drop'."'>".confirm(sprintf('Drop %s?',$fa))."\n";echo'<input type="hidden" name="token" value="',$gi,'">
</form>
';}elseif(isset($_GET["type"])){$ga=$_GET["type"];$J=$_POST;if($_POST&&!$l){$z=substr(ME,0,-1);if($_POST["drop"])query_redirect("DROP TYPE ".idf_escape($ga),$z,'Type has been dropped.');else
query_redirect("CREATE TYPE ".idf_escape(trim($J["name"]))." $J[as]",$z,'Type has been created.');}page_header($ga!=""?'Alter type'.": ".h($ga):'Create type',$l);if(!$J)$J["as"]="AS ";echo'
<form action="" method="post">
<p>
';if($ga!="")echo"<input type='submit' name='drop' value='".'Drop'."'>".confirm(sprintf('Drop %s?',$ga))."\n";else{echo"<input name='name' value='".h($J['name'])."' autocapitalize='off'>\n";textarea("as",$J["as"]);echo"<p><input type='submit' value='".'Save'."'>\n";}echo'<input type="hidden" name="token" value="',$gi,'">
</form>
';}elseif(isset($_GET["trigger"])){$a=$_GET["trigger"];$B=$_GET["name"];$ri=trigger_options();$J=(array)trigger($B,$a)+array("Trigger"=>$a."_bi");if($_POST){if(!$l&&in_array($_POST["Timing"],$ri["Timing"])&&in_array($_POST["Event"],$ri["Event"])&&in_array($_POST["Type"],$ri["Type"])){$mf=" ON ".table($a);$nc="DROP TRIGGER ".idf_escape($B).($w=="pgsql"?$mf:"");$_=ME."table=".urlencode($a);if($_POST["drop"])query_redirect($nc,$_,'Trigger has been dropped.');else{if($B!="")queries($nc);queries_redirect($_,($B!=""?'Trigger has been altered.':'Trigger has been created.'),queries(create_trigger($mf,$_POST)));if($B!="")queries(create_trigger($mf,$J+array("Type"=>reset($ri["Type"]))));}}$J=$_POST;}page_header(($B!=""?'Alter trigger'.": ".h($B):'Create trigger'),$l,array("table"=>$a));echo'
<form action="" method="post" id="form">
<table cellspacing="0" class="layout">
<tr><th>Time<td>',html_select("Timing",$ri["Timing"],$J["Timing"],"triggerChange(/^".preg_quote($a,"/")."_[ba][iud]$/, '".js_escape($a)."', this.form);"),'<tr><th>Event<td>',html_select("Event",$ri["Event"],$J["Event"],"this.form['Timing'].onchange();"),(in_array("UPDATE OF",$ri["Event"])?" <input name='Of' value='".h($J["Of"])."' class='hidden'>":""),'<tr><th>Type<td>',html_select("Type",$ri["Type"],$J["Type"]),'</table>
<p>Name: <input name="Trigger" value="',h($J["Trigger"]),'" data-maxlength="64" autocapitalize="off">
',script("qs('#form')['Timing'].onchange();"),'<p>';textarea("Statement",$J["Statement"]);echo'<p>
<input type="submit" value="Save">
';if($B!=""){echo'<input type="submit" name="drop" value="Drop">',confirm(sprintf('Drop %s?',$B));}echo'<input type="hidden" name="token" value="',$gi,'">
</form>
';}elseif(isset($_GET["user"])){$ha=$_GET["user"];$kg=array(""=>array("All privileges"=>""));foreach(get_rows("SHOW PRIVILEGES")as$J){foreach(explode(",",($J["Privilege"]=="Grant option"?"":$J["Context"]))as$Fb)$kg[$Fb][$J["Privilege"]]=$J["Comment"];}$kg["Server Admin"]+=$kg["File access on server"];$kg["Databases"]["Create routine"]=$kg["Procedures"]["Create routine"];unset($kg["Procedures"]["Create routine"]);$kg["Columns"]=array();foreach(array("Select","Insert","Update","References")as$X)$kg["Columns"][$X]=$kg["Tables"][$X];unset($kg["Server Admin"]["Usage"]);foreach($kg["Tables"]as$x=>$X)unset($kg["Databases"][$x]);$We=array();if($_POST){foreach($_POST["objects"]as$x=>$X)$We[$X]=(array)$We[$X]+(array)$_POST["grants"][$x];}$rd=array();$kf="";if(isset($_GET["host"])&&($H=$f->query("SHOW GRANTS FOR ".q($ha)."@".q($_GET["host"])))){while($J=$H->fetch_row()){if(preg_match('~GRANT (.*) ON (.*) TO ~',$J[0],$A)&&preg_match_all('~ *([^(,]*[^ ,(])( *\([^)]+\))?~',$A[1],$Ae,PREG_SET_ORDER)){foreach($Ae
as$X){if($X[1]!="USAGE")$rd["$A[2]$X[2]"][$X[1]]=true;if(preg_match('~ WITH GRANT OPTION~',$J[0]))$rd["$A[2]$X[2]"]["GRANT OPTION"]=true;}}if(preg_match("~ IDENTIFIED BY PASSWORD '([^']+)~",$J[0],$A))$kf=$A[1];}}if($_POST&&!$l){$lf=(isset($_GET["host"])?q($ha)."@".q($_GET["host"]):"''");if($_POST["drop"])query_redirect("DROP USER $lf",ME."privileges=",'User has been dropped.');else{$Ye=q($_POST["user"])."@".q($_POST["host"]);$Sf=$_POST["pass"];if($Sf!=''&&!$_POST["hashed"]&&!min_version(8)){$Sf=$f->result("SELECT PASSWORD(".q($Sf).")");$l=!$Sf;}$Lb=false;if(!$l){if($lf!=$Ye){$Lb=queries((min_version(5)?"CREATE USER":"GRANT USAGE ON *.* TO")." $Ye IDENTIFIED BY ".(min_version(8)?"":"PASSWORD ").q($Sf));$l=!$Lb;}elseif($Sf!=$kf)queries("SET PASSWORD FOR $Ye = ".q($Sf));}if(!$l){$Jg=array();foreach($We
as$ef=>$qd){if(isset($_GET["grant"]))$qd=array_filter($qd);$qd=array_keys($qd);if(isset($_GET["grant"]))$Jg=array_diff(array_keys(array_filter($We[$ef],'strlen')),$qd);elseif($lf==$Ye){$if=array_keys((array)$rd[$ef]);$Jg=array_diff($if,$qd);$qd=array_diff($qd,$if);unset($rd[$ef]);}if(preg_match('~^(.+)\s*(\(.*\))?$~U',$ef,$A)&&(!grant("REVOKE",$Jg,$A[2]," ON $A[1] FROM $Ye")||!grant("GRANT",$qd,$A[2]," ON $A[1] TO $Ye"))){$l=true;break;}}}if(!$l&&isset($_GET["host"])){if($lf!=$Ye)queries("DROP USER $lf");elseif(!isset($_GET["grant"])){foreach($rd
as$ef=>$Jg){if(preg_match('~^(.+)(\(.*\))?$~U',$ef,$A))grant("REVOKE",array_keys($Jg),$A[2]," ON $A[1] FROM $Ye");}}}queries_redirect(ME."privileges=",(isset($_GET["host"])?'User has been altered.':'User has been created.'),!$l);if($Lb)$f->query("DROP USER $Ye");}}page_header((isset($_GET["host"])?'Username'.": ".h("$ha@$_GET[host]"):'Create user'),$l,array("privileges"=>array('','Privileges')));if($_POST){$J=$_POST;$rd=$We;}else{$J=$_GET+array("host"=>$f->result("SELECT SUBSTRING_INDEX(CURRENT_USER, '@', -1)"));$J["pass"]=$kf;if($kf!="")$J["hashed"]=true;$rd[(DB==""||$rd?"":idf_escape(addcslashes(DB,"%_\\"))).".*"]=array();}echo'<form action="" method="post">
<table cellspacing="0" class="layout">
<tr><th>Server<td><input name="host" data-maxlength="60" value="',h($J["host"]),'" autocapitalize="off">
<tr><th>Username<td><input name="user" data-maxlength="80" value="',h($J["user"]),'" autocapitalize="off">
<tr><th>Password<td><input name="pass" id="pass" value="',h($J["pass"]),'" autocomplete="new-password">
';if(!$J["hashed"])echo
script("typePassword(qs('#pass'));");echo(min_version(8)?"":checkbox("hashed",1,$J["hashed"],'Hashed',"typePassword(this.form['pass'], this.checked);")),'</table>

';echo"<table cellspacing='0'>\n","<thead><tr><th colspan='2'>".'Privileges'.doc_link(array('sql'=>"grant.html#priv_level"));$s=0;foreach($rd
as$ef=>$qd){echo'<th>'.($ef!="*.*"?"<input name='objects[$s]' value='".h($ef)."' size='10' autocapitalize='off'>":"<input type='hidden' name='objects[$s]' value='*.*' size='10'>*.*");$s++;}echo"</thead>\n";foreach(array(""=>"","Server Admin"=>'Server',"Databases"=>'Database',"Tables"=>'Table',"Columns"=>'Column',"Procedures"=>'Routine',)as$Fb=>$ec){foreach((array)$kg[$Fb]as$jg=>$ub){echo"<tr".odd()."><td".($ec?">$ec<td":" colspan='2'").' lang="en" title="'.h($ub).'">'.h($jg);$s=0;foreach($rd
as$ef=>$qd){$B="'grants[$s][".h(strtoupper($jg))."]'";$Y=$qd[strtoupper($jg)];if($Fb=="Server Admin"&&$ef!=(isset($rd["*.*"])?"*.*":".*"))echo"<td>";elseif(isset($_GET["grant"]))echo"<td><select name=$B><option><option value='1'".($Y?" selected":"").">".'Grant'."<option value='0'".($Y=="0"?" selected":"").">".'Revoke'."</select>";else{echo"<td align='center'><label class='block'>","<input type='checkbox' name=$B value='1'".($Y?" checked":"").($jg=="All privileges"?" id='grants-$s-all'>":">".($jg=="Grant option"?"":script("qsl('input').onclick = function () { if (this.checked) formUncheck('grants-$s-all'); };"))),"</label>";}$s++;}}}echo"</table>\n",'<p>
<input type="submit" value="Save">
';if(isset($_GET["host"])){echo'<input type="submit" name="drop" value="Drop">',confirm(sprintf('Drop %s?',"$ha@$_GET[host]"));}echo'<input type="hidden" name="token" value="',$gi,'">
</form>
';}elseif(isset($_GET["processlist"])){if(support("kill")){if($_POST&&!$l){$ie=0;foreach((array)$_POST["kill"]as$X){if(kill_process($X))$ie++;}queries_redirect(ME."processlist=",lang(array('%d process has been killed.','%d processes have been killed.'),$ie),$ie||!$_POST["kill"]);}}page_header('Process list',$l);echo'
<form action="" method="post">
<div class="scrollable">
<table cellspacing="0" class="nowrap checkable">
',script("mixin(qsl('table'), {onclick: tableClick, ondblclick: partialArg(tableClick, true)});");$s=-1;foreach(process_list()as$s=>$J){if(!$s){echo"<thead><tr lang='en'>".(support("kill")?"<th>":"");foreach($J
as$x=>$X)echo"<th>$x".doc_link(array('sql'=>"show-processlist.html#processlist_".strtolower($x),'pgsql'=>"monitoring-stats.html#PG-STAT-ACTIVITY-VIEW",'oracle'=>"REFRN30223",));echo"</thead>\n";}echo"<tr".odd().">".(support("kill")?"<td>".checkbox("kill[]",$J[$w=="sql"?"Id":"pid"],0):"");foreach($J
as$x=>$X)echo"<td>".(($w=="sql"&&$x=="Info"&&preg_match("~Query|Killed~",$J["Command"])&&$X!="")||($w=="pgsql"&&$x=="current_query"&&$X!="<IDLE>")||($w=="oracle"&&$x=="sql_text"&&$X!="")?"<code class='jush-$w'>".shorten_utf8($X,100,"</code>").' <a href="'.h(ME.($J["db"]!=""?"db=".urlencode($J["db"])."&":"")."sql=".urlencode($X)).'">'.'Clone'.'</a>':h($X));echo"\n";}echo'</table>
</div>
<p>
';if(support("kill")){echo($s+1)."/".sprintf('%d in total',max_connections()),"<p><input type='submit' value='".'Kill'."'>\n";}echo'<input type="hidden" name="token" value="',$gi,'">
</form>
',script("tableCheck();");}elseif(isset($_GET["select"])){$a=$_GET["select"];$R=table_status1($a);$v=indexes($a);$n=fields($a);$jd=column_foreign_keys($a);$gf=$R["Oid"];parse_str($_COOKIE["adminer_import"],$ya);$Kg=array();$e=array();$Vh=null;foreach($n
as$x=>$m){$B=$b->fieldName($m);if(isset($m["privileges"]["select"])&&$B!=""){$e[$x]=html_entity_decode(strip_tags($B),ENT_QUOTES);if(is_shortable($m))$Vh=$b->selectLengthProcess();}$Kg+=$m["privileges"];}list($L,$sd)=$b->selectColumnsProcess($e,$v);$Zd=count($sd)<count($L);$Z=$b->selectSearchProcess($n,$v);$wf=$b->selectOrderProcess($n,$v);$y=$b->selectLimitProcess();if($_GET["val"]&&is_ajax()){header("Content-Type: text/plain; charset=utf-8");foreach($_GET["val"]as$zi=>$J){$Fa=convert_field($n[key($J)]);$L=array($Fa?$Fa:idf_escape(key($J)));$Z[]=where_check($zi,$n);$I=$k->select($a,$L,$Z,$L);if($I)echo
reset($I->fetch_row());}exit;}$fg=$Ai=null;foreach($v
as$u){if($u["type"]=="PRIMARY"){$fg=array_flip($u["columns"]);$Ai=($L?$fg:array());foreach($Ai
as$x=>$X){if(in_array(idf_escape($x),$L))unset($Ai[$x]);}break;}}if($gf&&!$fg){$fg=$Ai=array($gf=>0);$v[]=array("type"=>"PRIMARY","columns"=>array($gf));}if($_POST&&!$l){$cj=$Z;if(!$_POST["all"]&&is_array($_POST["check"])){$fb=array();foreach($_POST["check"]as$cb)$fb[]=where_check($cb,$n);$cj[]="((".implode(") OR (",$fb)."))";}$cj=($cj?"\nWHERE ".implode(" AND ",$cj):"");if($_POST["export"]){cookie("adminer_import","output=".urlencode($_POST["output"])."&format=".urlencode($_POST["format"]));dump_headers($a);$b->dumpTable($a,"");$nd=($L?implode(", ",$L):"*").convert_fields($e,$n,$L)."\nFROM ".table($a);$ud=($sd&&$Zd?"\nGROUP BY ".implode(", ",$sd):"").($wf?"\nORDER BY ".implode(", ",$wf):"");if(!is_array($_POST["check"])||$fg)$G="SELECT $nd$cj$ud";else{$xi=array();foreach($_POST["check"]as$X)$xi[]="(SELECT".limit($nd,"\nWHERE ".($Z?implode(" AND ",$Z)." AND ":"").where_check($X,$n).$ud,1).")";$G=implode(" UNION ALL ",$xi);}$b->dumpData($a,"table",$G);exit;}if(!$b->selectEmailProcess($Z,$jd)){if($_POST["save"]||$_POST["delete"]){$H=true;$za=0;$N=array();if(!$_POST["delete"]){foreach($e
as$B=>$X){$X=process_input($n[$B]);if($X!==null&&($_POST["clone"]||$X!==false))$N[idf_escape($B)]=($X!==false?$X:idf_escape($B));}}if($_POST["delete"]||$N){if($_POST["clone"])$G="INTO ".table($a)." (".implode(", ",array_keys($N)).")\nSELECT ".implode(", ",$N)."\nFROM ".table($a);if($_POST["all"]||($fg&&is_array($_POST["check"]))||$Zd){$H=($_POST["delete"]?$k->delete($a,$cj):($_POST["clone"]?queries("INSERT $G$cj"):$k->update($a,$N,$cj)));$za=$f->affected_rows;}else{foreach((array)$_POST["check"]as$X){$Yi="\nWHERE ".($Z?implode(" AND ",$Z)." AND ":"").where_check($X,$n);$H=($_POST["delete"]?$k->delete($a,$Yi,1):($_POST["clone"]?queries("INSERT".limit1($a,$G,$Yi)):$k->update($a,$N,$Yi,1)));if(!$H)break;$za+=$f->affected_rows;}}}$Je=lang(array('%d item has been affected.','%d items have been affected.'),$za);if($_POST["clone"]&&$H&&$za==1){$ne=last_id();if($ne)$Je=sprintf('Item%s has been inserted.'," $ne");}queries_redirect(remove_from_uri($_POST["all"]&&$_POST["delete"]?"page":""),$Je,$H);if(!$_POST["delete"]){edit_form($a,$n,(array)$_POST["fields"],!$_POST["clone"]);page_footer();exit;}}elseif(!$_POST["import"]){if(!$_POST["val"])$l='Ctrl+click on a value to modify it.';else{$H=true;$za=0;foreach($_POST["val"]as$zi=>$J){$N=array();foreach($J
as$x=>$X){$x=bracket_escape($x,1);$N[idf_escape($x)]=(preg_match('~char|text~',$n[$x]["type"])||$X!=""?$b->processInput($n[$x],$X):"NULL");}$H=$k->update($a,$N," WHERE ".($Z?implode(" AND ",$Z)." AND ":"").where_check($zi,$n),!$Zd&&!$fg," ");if(!$H)break;$za+=$f->affected_rows;}queries_redirect(remove_from_uri(),lang(array('%d item has been affected.','%d items have been affected.'),$za),$H);}}elseif(!is_string($Zc=get_file("csv_file",true)))$l=upload_error($Zc);elseif(!preg_match('~~u',$Zc))$l='File must be in UTF-8 encoding.';else{cookie("adminer_import","output=".urlencode($ya["output"])."&format=".urlencode($_POST["separator"]));$H=true;$qb=array_keys($n);preg_match_all('~(?>"[^"]*"|[^"\r\n]+)+~',$Zc,$Ae);$za=count($Ae[0]);$k->begin();$ah=($_POST["separator"]=="csv"?",":($_POST["separator"]=="tsv"?"\t":";"));$K=array();foreach($Ae[0]as$x=>$X){preg_match_all("~((?>\"[^\"]*\")+|[^$ah]*)$ah~",$X.$ah,$Be);if(!$x&&!array_diff($Be[1],$qb)){$qb=$Be[1];$za--;}else{$N=array();foreach($Be[1]as$s=>$lb)$N[idf_escape($qb[$s])]=($lb==""&&$n[$qb[$s]]["null"]?"NULL":q(str_replace('""','"',preg_replace('~^"|"$~','',$lb))));$K[]=$N;}}$H=(!$K||$k->insertUpdate($a,$K,$fg));if($H)$H=$k->commit();queries_redirect(remove_from_uri("page"),lang(array('%d row has been imported.','%d rows have been imported.'),$za),$H);$k->rollback();}}}$Hh=$b->tableName($R);if(is_ajax()){page_headers();ob_start();}else
page_header('Select'.": $Hh",$l);$N=null;if(isset($Kg["insert"])||!support("table")){$Lf=array();foreach((array)$_GET["where"]as$X){if(isset($jd[$X["col"]])&&count($jd[$X["col"]])==1&&($X["op"]=="="||(!$X["op"]&&(is_array($X["val"])||!preg_match('~[_%]~',$X["val"])))))$Lf["set"."[".bracket_escape($X["col"])."]"]=$X["val"];}$N=$Lf?"&".http_build_query($Lf):"";}$b->selectLinks($R,$N);if(!$e&&support("table"))echo"<p class='error'>".'Unable to select the table'.($n?".":": ".error())."\n";else{echo"<form action='' id='form'>\n","<div style='display: none;'>";hidden_fields_get();echo(DB!=""?'<input type="hidden" name="db" value="'.h(DB).'">'.(isset($_GET["ns"])?'<input type="hidden" name="ns" value="'.h($_GET["ns"]).'">':""):"");echo'<input type="hidden" name="select" value="'.h($a).'">',"</div>\n";$b->selectColumnsPrint($L,$e);$b->selectSearchPrint($Z,$e,$v);$b->selectOrderPrint($wf,$e,$v);$b->selectLimitPrint($y);$b->selectLengthPrint($Vh);$b->selectActionPrint($v);echo"</form>\n";$E=$_GET["page"];if($E=="last"){$md=$f->result(count_rows($a,$Z,$Zd,$sd));$E=floor(max(0,$md-1)/$y);}$Vg=$L;$td=$sd;if(!$Vg){$Vg[]="*";$Gb=convert_fields($e,$n,$L);if($Gb)$Vg[]=substr($Gb,2);}foreach($L
as$x=>$X){$m=$n[idf_unescape($X)];if($m&&($Fa=convert_field($m)))$Vg[$x]="$Fa AS $X";}if(!$Zd&&$Ai){foreach($Ai
as$x=>$X){$Vg[]=idf_escape($x);if($td)$td[]=idf_escape($x);}}$H=$k->select($a,$Vg,$Z,$td,$wf,$y,$E,true);if(!$H)echo"<p class='error'>".error()."\n";else{if($w=="mssql"&&$E)$H->seek($y*$E);$_c=array();echo"<form action='' method='post' enctype='multipart/form-data'>\n";$K=array();while($J=$H->fetch_assoc()){if($E&&$w=="oracle")unset($J["RNUM"]);$K[]=$J;}if($_GET["page"]!="last"&&$y!=""&&$sd&&$Zd&&$w=="sql")$md=$f->result(" SELECT FOUND_ROWS()");if(!$K)echo"<p class='message'>".'No rows.'."\n";else{$Oa=$b->backwardKeys($a,$Hh);echo"<div class='scrollable'>","<table id='table' cellspacing='0' class='nowrap checkable'>",script("mixin(qs('#table'), {onclick: tableClick, ondblclick: partialArg(tableClick, true), onkeydown: editingKeydown});"),"<thead><tr>".(!$sd&&$L?"":"<td><input type='checkbox' id='all-page' class='jsonly'>".script("qs('#all-page').onclick = partial(formCheck, /check/);","")." <a href='".h($_GET["modify"]?remove_from_uri("modify"):$_SERVER["REQUEST_URI"]."&modify=1")."'>".'Modify'."</a>");$Ue=array();$od=array();reset($L);$tg=1;foreach($K[0]as$x=>$X){if(!isset($Ai[$x])){$X=$_GET["columns"][key($L)];$m=$n[$L?($X?$X["col"]:current($L)):$x];$B=($m?$b->fieldName($m,$tg):($X["fun"]?"*":h($x)));if($B!=""){$tg++;$Ue[$x]=$B;$d=idf_escape($x);$Fd=remove_from_uri('(order|desc)[^=]*|page').'&order%5B0%5D='.urlencode($x);$ec="&desc%5B0%5D=1";echo"<th id='th[".h(bracket_escape($x))."]'>".script("mixin(qsl('th'), {onmouseover: partial(columnMouse), onmouseout: partial(columnMouse, ' hidden')});",""),'<a href="'.h($Fd.($wf[0]==$d||$wf[0]==$x||(!$wf&&$Zd&&$sd[0]==$d)?$ec:'')).'">';echo
apply_sql_function($X["fun"],$B)."</a>";echo"<span class='column hidden'>","<a href='".h($Fd.$ec)."' title='".'descending'."' class='text'> â†“</a>";if(!$X["fun"]){echo'<a href="#fieldset-search" title="'.'Search'.'" class="text jsonly"> =</a>',script("qsl('a').onclick = partial(selectSearch, '".js_escape($x)."');");}echo"</span>";}$od[$x]=$X["fun"];next($L);}}$te=array();if($_GET["modify"]){foreach($K
as$J){foreach($J
as$x=>$X)$te[$x]=max($te[$x],min(40,strlen(utf8_decode($X))));}}echo($Oa?"<th>".'Relations':"")."</thead>\n";if(is_ajax()){if($y%2==1&&$E%2==1)odd();ob_end_clean();}foreach($b->rowDescriptions($K,$jd)as$Te=>$J){$yi=unique_array($K[$Te],$v);if(!$yi){$yi=array();foreach($K[$Te]as$x=>$X){if(!preg_match('~^(COUNT\((\*|(DISTINCT )?`(?:[^`]|``)+`)\)|(AVG|GROUP_CONCAT|MAX|MIN|SUM)\(`(?:[^`]|``)+`\))$~',$x))$yi[$x]=$X;}}$zi="";foreach($yi
as$x=>$X){if(($w=="sql"||$w=="pgsql")&&preg_match('~char|text|enum|set~',$n[$x]["type"])&&strlen($X)>64){$x=(strpos($x,'(')?$x:idf_escape($x));$x="MD5(".($w!='sql'||preg_match("~^utf8~",$n[$x]["collation"])?$x:"CONVERT($x USING ".charset($f).")").")";$X=md5($X);}$zi.="&".($X!==null?urlencode("where[".bracket_escape($x)."]")."=".urlencode($X===false?"f":$X):"null%5B%5D=".urlencode($x));}echo"<tr".odd().">".(!$sd&&$L?"":"<td>".checkbox("check[]",substr($zi,1),in_array(substr($zi,1),(array)$_POST["check"])).($Zd||information_schema(DB)?"":" <a href='".h(ME."edit=".urlencode($a).$zi)."' class='edit'>".'edit'."</a>"));foreach($J
as$x=>$X){if(isset($Ue[$x])){$m=$n[$x];$X=$k->value($X,$m);if($X!=""&&(!isset($_c[$x])||$_c[$x]!=""))$_c[$x]=(is_mail($X)?$Ue[$x]:"");$z="";if(preg_match('~blob|bytea|raw|file~',$m["type"])&&$X!="")$z=ME.'download='.urlencode($a).'&field='.urlencode($x).$zi;if(!$z&&$X!==null){foreach((array)$jd[$x]as$p){if(count($jd[$x])==1||end($p["source"])==$x){$z="";foreach($p["source"]as$s=>$ph)$z.=where_link($s,$p["target"][$s],$K[$Te][$ph]);$z=($p["db"]!=""?preg_replace('~([?&]db=)[^&]+~','\1'.urlencode($p["db"]),ME):ME).'select='.urlencode($p["table"]).$z;if($p["ns"])$z=preg_replace('~([?&]ns=)[^&]+~','\1'.urlencode($p["ns"]),$z);if(count($p["source"])==1)break;}}}if($x=="COUNT(*)"){$z=ME."select=".urlencode($a);$s=0;foreach((array)$_GET["where"]as$W){if(!array_key_exists($W["col"],$yi))$z.=where_link($s++,$W["col"],$W["val"],$W["op"]);}foreach($yi
as$ee=>$W)$z.=where_link($s++,$ee,$W);}$X=select_value($X,$z,$m,$Vh);$Gd=h("val[$zi][".bracket_escape($x)."]");$Y=$_POST["val"][$zi][bracket_escape($x)];$vc=!is_array($J[$x])&&is_utf8($X)&&$K[$Te][$x]==$J[$x]&&!$od[$x];$Th=preg_match('~text|lob~',$m["type"]);echo"<td id='$Gd'";if(($_GET["modify"]&&$vc)||$Y!==null){$xd=h($Y!==null?$Y:$J[$x]);echo">".($Th?"<textarea name='$Gd' cols='30' rows='".(substr_count($J[$x],"\n")+1)."'>$xd</textarea>":"<input name='$Gd' value='$xd' size='$te[$x]'>");}else{$xe=strpos($X,"<i>â€¦</i>");echo" data-text='".($xe?2:($Th?1:0))."'".($vc?"":" data-warning='".h('Use edit link to modify this value.')."'").">$X</td>";}}}if($Oa)echo"<td>";$b->backwardKeysPrint($Oa,$K[$Te]);echo"</tr>\n";}if(is_ajax())exit;echo"</table>\n","</div>\n";}if(!is_ajax()){if($K||$E){$Kc=true;if($_GET["page"]!="last"){if($y==""||(count($K)<$y&&($K||!$E)))$md=($E?$E*$y:0)+count($K);elseif($w!="sql"||!$Zd){$md=($Zd?false:found_rows($R,$Z));if($md<max(1e4,2*($E+1)*$y))$md=reset(slow_query(count_rows($a,$Z,$Zd,$sd)));else$Kc=false;}}$Jf=($y!=""&&($md===false||$md>$y||$E));if($Jf){echo(($md===false?count($K)+1:$md-$E*$y)>$y?'<p><a href="'.h(remove_from_uri("page")."&page=".($E+1)).'" class="loadmore">'.'Load more data'.'</a>'.script("qsl('a').onclick = partial(selectLoadMore, ".(+$y).", '".'Loading'."â€¦');",""):''),"\n";}}echo"<div class='footer'><div>\n";if($K||$E){if($Jf){$De=($md===false?$E+(count($K)>=$y?2:1):floor(($md-1)/$y));echo"<fieldset>";if($w!="simpledb"){echo"<legend><a href='".h(remove_from_uri("page"))."'>".'Page'."</a></legend>",script("qsl('a').onclick = function () { pageClick(this.href, +prompt('".'Page'."', '".($E+1)."')); return false; };"),pagination(0,$E).($E>5?" â€¦":"");for($s=max(1,$E-4);$s<min($De,$E+5);$s++)echo
pagination($s,$E);if($De>0){echo($E+5<$De?" â€¦":""),($Kc&&$md!==false?pagination($De,$E):" <a href='".h(remove_from_uri("page")."&page=last")."' title='~$De'>".'last'."</a>");}}else{echo"<legend>".'Page'."</legend>",pagination(0,$E).($E>1?" â€¦":""),($E?pagination($E,$E):""),($De>$E?pagination($E+1,$E).($De>$E+1?" â€¦":""):"");}echo"</fieldset>\n";}echo"<fieldset>","<legend>".'Whole result'."</legend>";$kc=($Kc?"":"~ ").$md;echo
checkbox("all",1,0,($md!==false?($Kc?"":"~ ").lang(array('%d row','%d rows'),$md):""),"var checked = formChecked(this, /check/); selectCount('selected', this.checked ? '$kc' : checked); selectCount('selected2', this.checked || !checked ? '$kc' : checked);")."\n","</fieldset>\n";if($b->selectCommandPrint()){echo'<fieldset',($_GET["modify"]?'':' class="jsonly"'),'><legend>Modify</legend><div>
<input type="submit" value="Save"',($_GET["modify"]?'':' title="'.'Ctrl+click on a value to modify it.'.'"'),'>
</div></fieldset>
<fieldset><legend>Selected <span id="selected"></span></legend><div>
<input type="submit" name="edit" value="Edit">
<input type="submit" name="clone" value="Clone">
<input type="submit" name="delete" value="Delete">',confirm(),'</div></fieldset>
';}$kd=$b->dumpFormat();foreach((array)$_GET["columns"]as$d){if($d["fun"]){unset($kd['sql']);break;}}if($kd){print_fieldset("export",'Export'." <span id='selected2'></span>");$Gf=$b->dumpOutput();echo($Gf?html_select("output",$Gf,$ya["output"])." ":""),html_select("format",$kd,$ya["format"])," <input type='submit' name='export' value='".'Export'."'>\n","</div></fieldset>\n";}$b->selectEmailPrint(array_filter($_c,'strlen'),$e);}echo"</div></div>\n";if($b->selectImportPrint()){echo"<div>","<a href='#import'>".'Import'."</a>",script("qsl('a').onclick = partial(toggle, 'import');",""),"<span id='import' class='hidden'>: ","<input type='file' name='csv_file'> ",html_select("separator",array("csv"=>"CSV,","csv;"=>"CSV;","tsv"=>"TSV"),$ya["format"],1);echo" <input type='submit' name='import' value='".'Import'."'>","</span>","</div>";}echo"<input type='hidden' name='token' value='$gi'>\n","</form>\n",(!$sd&&$L?"":script("tableCheck();"));}}}if(is_ajax()){ob_end_clean();exit;}}elseif(isset($_GET["variables"])){$O=isset($_GET["status"]);page_header($O?'Status':'Variables');$Pi=($O?show_status():show_variables());if(!$Pi)echo"<p class='message'>".'No rows.'."\n";else{echo"<table cellspacing='0'>\n";foreach($Pi
as$x=>$X){echo"<tr>","<th><code class='jush-".$w.($O?"status":"set")."'>".h($x)."</code>","<td>".h($X);}echo"</table>\n";}}elseif(isset($_GET["script"])){header("Content-Type: text/javascript; charset=utf-8");if($_GET["script"]=="db"){$Eh=array("Data_length"=>0,"Index_length"=>0,"Data_free"=>0);foreach(table_status()as$B=>$R){json_row("Comment-$B",h($R["Comment"]));if(!is_view($R)){foreach(array("Engine","Collation")as$x)json_row("$x-$B",h($R[$x]));foreach($Eh+array("Auto_increment"=>0,"Rows"=>0)as$x=>$X){if($R[$x]!=""){$X=format_number($R[$x]);json_row("$x-$B",($x=="Rows"&&$X&&$R["Engine"]==($w=="pgsql"?"table":"InnoDB")?"~ $X":$X));if(isset($Eh[$x]))$Eh[$x]+=($R["Engine"]!="InnoDB"||$x!="Data_free"?$R[$x]:0);}elseif(array_key_exists($x,$R))json_row("$x-$B");}}}foreach($Eh
as$x=>$X)json_row("sum-$x",format_number($X));json_row("");}elseif($_GET["script"]=="kill")$f->query("KILL ".number($_POST["kill"]));else{foreach(count_tables($b->databases())as$j=>$X){json_row("tables-$j",$X);json_row("size-$j",db_size($j));}json_row("");}exit;}else{$Nh=array_merge((array)$_POST["tables"],(array)$_POST["views"]);if($Nh&&!$l&&!$_POST["search"]){$H=true;$Je="";if($w=="sql"&&$_POST["tables"]&&count($_POST["tables"])>1&&($_POST["drop"]||$_POST["truncate"]||$_POST["copy"]))queries("SET foreign_key_checks = 0");if($_POST["truncate"]){if($_POST["tables"])$H=truncate_tables($_POST["tables"]);$Je='Tables have been truncated.';}elseif($_POST["move"]){$H=move_tables((array)$_POST["tables"],(array)$_POST["views"],$_POST["target"]);$Je='Tables have been moved.';}elseif($_POST["copy"]){$H=copy_tables((array)$_POST["tables"],(array)$_POST["views"],$_POST["target"]);$Je='Tables have been copied.';}elseif($_POST["drop"]){if($_POST["views"])$H=drop_views($_POST["views"]);if($H&&$_POST["tables"])$H=drop_tables($_POST["tables"]);$Je='Tables have been dropped.';}elseif($w!="sql"){$H=($w=="sqlite"?queries("VACUUM"):apply_queries("VACUUM".($_POST["optimize"]?"":" ANALYZE"),$_POST["tables"]));$Je='Tables have been optimized.';}elseif(!$_POST["tables"])$Je='No tables.';elseif($H=queries(($_POST["optimize"]?"OPTIMIZE":($_POST["check"]?"CHECK":($_POST["repair"]?"REPAIR":"ANALYZE")))." TABLE ".implode(", ",array_map('idf_escape',$_POST["tables"])))){while($J=$H->fetch_assoc())$Je.="<b>".h($J["Table"])."</b>: ".h($J["Msg_text"])."<br>";}queries_redirect(substr(ME,0,-1),$Je,$H);}page_header(($_GET["ns"]==""?'Database'.": ".h(DB):'Schema'.": ".h($_GET["ns"])),$l,true);if($b->homepage()){if($_GET["ns"]!==""){echo"<h3 id='tables-views'>".'Tables and views'."</h3>\n";$Mh=tables_list();if(!$Mh)echo"<p class='message'>".'No tables.'."\n";else{echo"<form action='' method='post'>\n";if(support("table")){echo"<fieldset><legend>".'Search data in tables'." <span id='selected2'></span></legend><div>","<input type='search' name='query' value='".h($_POST["query"])."'>",script("qsl('input').onkeydown = partialArg(bodyKeydown, 'search');","")," <input type='submit' name='search' value='".'Search'."'>\n","</div></fieldset>\n";if($_POST["search"]&&$_POST["query"]!=""){$_GET["where"][0]["op"]=$k->convertOperator("LIKE %%");search_tables();}}echo"<div class='scrollable'>\n","<table cellspacing='0' class='nowrap checkable'>\n",script("mixin(qsl('table'), {onclick: tableClick, ondblclick: partialArg(tableClick, true)});"),'<thead><tr class="wrap">','<td><input id="check-all" type="checkbox" class="jsonly">'.script("qs('#check-all').onclick = partial(formCheck, /^(tables|views)\[/);",""),'<th>'.'Table','<td>'.'Engine'.doc_link(array('sql'=>'storage-engines.html')),'<td>'.'Collation'.doc_link(array('sql'=>'charset-charsets.html','mariadb'=>'supported-character-sets-and-collations/')),'<td>'.'Data Length'.doc_link(array('sql'=>'show-table-status.html','pgsql'=>'functions-admin.html#FUNCTIONS-ADMIN-DBOBJECT','oracle'=>'REFRN20286')),'<td>'.'Index Length'.doc_link(array('sql'=>'show-table-status.html','pgsql'=>'functions-admin.html#FUNCTIONS-ADMIN-DBOBJECT')),'<td>'.'Data Free'.doc_link(array('sql'=>'show-table-status.html')),'<td>'.'Auto Increment'.doc_link(array('sql'=>'example-auto-increment.html','mariadb'=>'auto_increment/')),'<td>'.'Rows'.doc_link(array('sql'=>'show-table-status.html','pgsql'=>'catalog-pg-class.html#CATALOG-PG-CLASS','oracle'=>'REFRN20286')),(support("comment")?'<td>'.'Comment'.doc_link(array('sql'=>'show-table-status.html','pgsql'=>'functions-info.html#FUNCTIONS-INFO-COMMENT-TABLE')):''),"</thead>\n";$S=0;foreach($Mh
as$B=>$T){$Si=($T!==null&&!preg_match('~table|sequence~i',$T));$Gd=h("Table-".$B);echo'<tr'.odd().'><td>'.checkbox(($Si?"views[]":"tables[]"),$B,in_array($B,$Nh,true),"","","",$Gd),'<th>'.(support("table")||support("indexes")?"<a href='".h(ME)."table=".urlencode($B)."' title='".'Show structure'."' id='$Gd'>".h($B).'</a>':h($B));if($Si){echo'<td colspan="6"><a href="'.h(ME)."view=".urlencode($B).'" title="'.'Alter view'.'">'.(preg_match('~materialized~i',$T)?'Materialized view':'View').'</a>','<td align="right"><a href="'.h(ME)."select=".urlencode($B).'" title="'.'Select data'.'">?</a>';}else{foreach(array("Engine"=>array(),"Collation"=>array(),"Data_length"=>array("create",'Alter table'),"Index_length"=>array("indexes",'Alter indexes'),"Data_free"=>array("edit",'New item'),"Auto_increment"=>array("auto_increment=1&create",'Alter table'),"Rows"=>array("select",'Select data'),)as$x=>$z){$Gd=" id='$x-".h($B)."'";echo($z?"<td align='right'>".(support("table")||$x=="Rows"||(support("indexes")&&$x!="Data_length")?"<a href='".h(ME."$z[0]=").urlencode($B)."'$Gd title='$z[1]'>?</a>":"<span$Gd>?</span>"):"<td id='$x-".h($B)."'>");}$S++;}echo(support("comment")?"<td id='Comment-".h($B)."'>":"");}echo"<tr><td><th>".sprintf('%d in total',count($Mh)),"<td>".h($w=="sql"?$f->result("SELECT @@default_storage_engine"):""),"<td>".h(db_collation(DB,collations()));foreach(array("Data_length","Index_length","Data_free")as$x)echo"<td align='right' id='sum-$x'>";echo"</table>\n","</div>\n";if(!information_schema(DB)){echo"<div class='footer'><div>\n";$Li="<input type='submit' value='".'Vacuum'."'> ".on_help("'VACUUM'");$tf="<input type='submit' name='optimize' value='".'Optimize'."'> ".on_help($w=="sql"?"'OPTIMIZE TABLE'":"'VACUUM OPTIMIZE'");echo"<fieldset><legend>".'Selected'." <span id='selected'></span></legend><div>".($w=="sqlite"?$Li:($w=="pgsql"?$Li.$tf:($w=="sql"?"<input type='submit' value='".'Analyze'."'> ".on_help("'ANALYZE TABLE'").$tf."<input type='submit' name='check' value='".'Check'."'> ".on_help("'CHECK TABLE'")."<input type='submit' name='repair' value='".'Repair'."'> ".on_help("'REPAIR TABLE'"):"")))."<input type='submit' name='truncate' value='".'Truncate'."'> ".on_help($w=="sqlite"?"'DELETE'":"'TRUNCATE".($w=="pgsql"?"'":" TABLE'")).confirm()."<input type='submit' name='drop' value='".'Drop'."'>".on_help("'DROP TABLE'").confirm()."\n";$i=(support("scheme")?$b->schemas():$b->databases());if(count($i)!=1&&$w!="sqlite"){$j=(isset($_POST["target"])?$_POST["target"]:(support("scheme")?$_GET["ns"]:DB));echo"<p>".'Move to other database'.": ",($i?html_select("target",$i,$j):'<input name="target" value="'.h($j).'" autocapitalize="off">')," <input type='submit' name='move' value='".'Move'."'>",(support("copy")?" <input type='submit' name='copy' value='".'Copy'."'> ".checkbox("overwrite",1,$_POST["overwrite"],'overwrite'):""),"\n";}echo"<input type='hidden' name='all' value=''>";echo
script("qsl('input').onclick = function () { selectCount('selected', formChecked(this, /^(tables|views)\[/));".(support("table")?" selectCount('selected2', formChecked(this, /^tables\[/) || $S);":"")." }"),"<input type='hidden' name='token' value='$gi'>\n","</div></fieldset>\n","</div></div>\n";}echo"</form>\n",script("tableCheck();");}echo'<p class="links"><a href="'.h(ME).'create=">'.'Create table'."</a>\n",(support("view")?'<a href="'.h(ME).'view=">'.'Create view'."</a>\n":"");if(support("routine")){echo"<h3 id='routines'>".'Routines'."</h3>\n";$Og=routines();if($Og){echo"<table cellspacing='0'>\n",'<thead><tr><th>'.'Name'.'<td>'.'Type'.'<td>'.'Return type'."<td></thead>\n";odd('');foreach($Og
as$J){$B=($J["SPECIFIC_NAME"]==$J["ROUTINE_NAME"]?"":"&name=".urlencode($J["ROUTINE_NAME"]));echo'<tr'.odd().'>','<th><a href="'.h(ME.($J["ROUTINE_TYPE"]!="PROCEDURE"?'callf=':'call=').urlencode($J["SPECIFIC_NAME"]).$B).'">'.h($J["ROUTINE_NAME"]).'</a>','<td>'.h($J["ROUTINE_TYPE"]),'<td>'.h($J["DTD_IDENTIFIER"]),'<td><a href="'.h(ME.($J["ROUTINE_TYPE"]!="PROCEDURE"?'function=':'procedure=').urlencode($J["SPECIFIC_NAME"]).$B).'">'.'Alter'."</a>";}echo"</table>\n";}echo'<p class="links">'.(support("procedure")?'<a href="'.h(ME).'procedure=">'.'Create procedure'.'</a>':'').'<a href="'.h(ME).'function=">'.'Create function'."</a>\n";}if(support("sequence")){echo"<h3 id='sequences'>".'Sequences'."</h3>\n";$dh=get_vals("SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = current_schema() ORDER BY sequence_name");if($dh){echo"<table cellspacing='0'>\n","<thead><tr><th>".'Name'."</thead>\n";odd('');foreach($dh
as$X)echo"<tr".odd()."><th><a href='".h(ME)."sequence=".urlencode($X)."'>".h($X)."</a>\n";echo"</table>\n";}echo"<p class='links'><a href='".h(ME)."sequence='>".'Create sequence'."</a>\n";}if(support("type")){echo"<h3 id='user-types'>".'User types'."</h3>\n";$Ji=types();if($Ji){echo"<table cellspacing='0'>\n","<thead><tr><th>".'Name'."</thead>\n";odd('');foreach($Ji
as$X)echo"<tr".odd()."><th><a href='".h(ME)."type=".urlencode($X)."'>".h($X)."</a>\n";echo"</table>\n";}echo"<p class='links'><a href='".h(ME)."type='>".'Create type'."</a>\n";}if(support("event")){echo"<h3 id='events'>".'Events'."</h3>\n";$K=get_rows("SHOW EVENTS");if($K){echo"<table cellspacing='0'>\n","<thead><tr><th>".'Name'."<td>".'Schedule'."<td>".'Start'."<td>".'End'."<td></thead>\n";foreach($K
as$J){echo"<tr>","<th>".h($J["Name"]),"<td>".($J["Execute at"]?'At given time'."<td>".$J["Execute at"]:'Every'." ".$J["Interval value"]." ".$J["Interval field"]."<td>$J[Starts]"),"<td>$J[Ends]",'<td><a href="'.h(ME).'event='.urlencode($J["Name"]).'">'.'Alter'.'</a>';}echo"</table>\n";$Ic=$f->result("SELECT @@event_scheduler");if($Ic&&$Ic!="ON")echo"<p class='error'><code class='jush-sqlset'>event_scheduler</code>: ".h($Ic)."\n";}echo'<p class="links"><a href="'.h(ME).'event=">'.'Create event'."</a>\n";}if($Mh)echo
script("ajaxSetHtml('".js_escape(ME)."script=db');");}}}page_footer();